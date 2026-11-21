import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LeoLivreurSnapshot } from "./LeoLivreurGame";
import { addressById, MISSION_ADDRESSES, planGame, TOUR_ADDRESSES } from "./leoMission";

const { controllerMock } = vi.hoisted(() => ({
  controllerMock: {
    listener: null as ((snapshot: LeoLivreurSnapshot) => void) | null,
    destroy: vi.fn(),
    refreshLayout: vi.fn(),
    startMission: vi.fn(),
    setDestination: vi.fn(),
    lockDriving: vi.fn(),
    resumeDriving: vi.fn(),
    handOver: vi.fn(async () => undefined),
    returnToRestaurant: vi.fn(),
    cue: vi.fn(),
    reset: vi.fn(),
    setControl: vi.fn(),
    turn: vi.fn(),
    setPaused: vi.fn(),
    retryAssets: vi.fn(),
    setSound: vi.fn((on: boolean) => on),
    horn: vi.fn(),
  },
}));

vi.mock("./LeoLivreurGame", () => ({
  mountLeoLivreurGame: (_host: HTMLElement, listener: (snapshot: LeoLivreurSnapshot) => void) => {
    controllerMock.listener = listener;
    return controllerMock;
  },
}));

import { LeoLivreurPrototypePage } from "./LeoLivreurPrototypePage";
import { NOTICE_DURATION_MS } from "./LeoDeliveryNotice";

/** Graines des deux parties jouées : Math.random est figé pour connaître les réponses. */
const RANDOMS = [0.25, 0.75];
const seedOf = (value: number) => Math.floor(value * 2 ** 31);

const base: LeoLivreurSnapshot = {
  phase: "INTRO",
  speedKmh: 0,
  heading: 0,
  steering: 0,
  targetLabel: MISSION_ADDRESSES[0].label,
  remainingMeters: 800,
  destinationStatus: "ahead",
  signalState: null,
  signalMessage: null,
  signalDistance: null,
  signalPrepare: false,
  travelledMeters: 0,
  assets: "ready",
  assetsLoaded: null,
  assetsTotal: null,
};

let current = base;
const push = (patch: Partial<LeoLivreurSnapshot>) => {
  current = { ...current, ...patch };
  act(() => controllerMock.listener?.(current));
};

const dialog = () => screen.getByRole("dialog");

/** Saisit un nombre au pavé numérique, puis Valider. */
function answer(value: number) {
  const pad = within(dialog());
  for (const digit of String(value)) fireEvent.click(pad.getByRole("button", { name: digit }));
  fireEvent.click(pad.getByRole("button", { name: "Valider" }));
}

const deliverButton = () => screen.queryByRole("button", { name: "LIVRER" });

/** Léo s'arrête devant la maison en cours, l'enfant appuie sur LIVRER et répond juste. */
async function deliverAt(label: string, rightAnswer: number) {
  push({ phase: "ARRIVED", speedKmh: 0, targetLabel: label, remainingMeters: 0 });
  fireEvent.click(deliverButton() as HTMLElement);
  await screen.findByRole("dialog", { name: `Livraison — ${label}` });
  answer(rightAnswer);
  expect(within(dialog()).getByText(/Bravo ! Livraison validée/)).toBeInTheDocument();
}

// Partie entière jouée au clic : plus longue que les 5 s par défaut quand toute la suite tourne en parallèle.
describe("mission complète de Léo : deux tournées, cinq maisons, sept questions", { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    current = base;
    let call = 0;
    vi.spyOn(Math, "random").mockImplementation(() => RANDOMS[Math.min(call++, RANDOMS.length - 1)]);
  });
  afterEach(() => vi.restoreAllMocks());

  it("charge, conduit, livre, répond, fait le bilan de chaque tournée et propose de rejouer", async () => {
    const plan = planGame(seedOf(RANDOMS[0]));
    render(<LeoLivreurPrototypePage startInDrivingMode />);
    push({});
    expect(controllerMock.setDestination).toHaveBeenLastCalledWith(MISSION_ADDRESSES[0].destination);
    fireEvent.click(screen.getByRole("button", { name: "Commencer" }));

    for (let tour = 0; tour < 2; tour += 1) {
      const tourPlan = plan.tours[tour];
      // Pizzeria : les commandes de la tournée, puis la question de chargement.
      const restaurant = screen.getByRole("dialog", { name: `Tournée ${tour + 1} — Préparation` });
      expect(within(restaurant).getByText(tourPlan.load.prompt as string)).toBeInTheDocument();
      for (const [index, id] of tourPlan.addresses.entries()) {
        expect(within(restaurant).getByText(addressById(id).label).nextElementSibling).toHaveTextContent(`${tourPlan.orders[index]} pizza`);
      }
      answer(tourPlan.load.answer);
      const load = tourPlan.orders.reduce((sum, value) => sum + value, 0);
      expect(within(dialog()).getByText(`Bravo ! ${load} pizzas dans la voiture.`)).toBeInTheDocument();
      push({ travelledMeters: tour * 1000 });
      fireEvent.click(screen.getByRole("button", { name: "Partir" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(controllerMock.resumeDriving).toHaveBeenCalled();
      expect(within(screen.getByLabelText("Tableau de bord")).getByText(String(load))).toBeInTheDocument();

      for (const [stop, id] of tourPlan.addresses.entries()) {
        const address = addressById(id);
        expect(controllerMock.setDestination).toHaveBeenLastCalledWith(address.destination);
        // En route : pas de bouton LIVRER.
        push({ phase: "DRIVING", speedKmh: 45, targetLabel: address.label, remainingMeters: 300 });
        expect(deliverButton()).not.toBeInTheDocument();
        await deliverAt(address.label, tourPlan.deliveries[stop].answer);
        push({ travelledMeters: tour * 1000 + (stop + 1) * 400 });
        const last = stop + 1 === tourPlan.addresses.length;
        fireEvent.click(screen.getByRole("button", { name: last ? "Terminer la tournée" : "Reprendre la route" }));
      }

      // Dernière maison livrée : conduite arrêtée, question sur les pizzas restantes (toutes livrées : 0).
      const closing = screen.getByRole("dialog", { name: `Tournée ${tour + 1} — Bilan des pizzas` });
      expect(controllerMock.lockDriving).toHaveBeenCalled();
      expect(within(closing).getByText(/Combien de pizzas lui reste-t-il/)).toBeInTheDocument();
      answer(0);
      fireEvent.click(screen.getByRole("button", { name: "Voir le bilan de la tournée" }));

      const summary = screen.getByRole("dialog", { name: `Bilan de la tournée ${tour + 1}` });
      expect(within(summary).getByRole("img", { name: "3 étoiles sur 3" })).toBeInTheDocument();
      expect(within(summary).getByText("Livraisons réussies").nextElementSibling).toHaveTextContent(String(TOUR_ADDRESSES[tour].length));
      expect(within(summary).getByText("Livraisons manquées").nextElementSibling).toHaveTextContent("0");
      expect(within(summary).getByText("Pizzas restantes").nextElementSibling).toHaveTextContent("0");
      expect(within(summary).getByText("Pizzas livrées").nextElementSibling).toHaveTextContent(String(load));
      expect(within(summary).getByText("Distance parcourue").nextElementSibling).toHaveTextContent(tour === 0 ? "0,80 km" : "1,20 km");
      if (tour === 0) {
        fireEvent.click(screen.getByRole("button", { name: "Retour au restaurant" }));
        expect(controllerMock.returnToRestaurant).toHaveBeenCalledOnce();
      } else {
        fireEvent.click(screen.getByRole("button", { name: "Voir le bilan final" }));
      }
    }

    const final = screen.getByRole("dialog", { name: "Bilan final" });
    expect(within(final).getByRole("img", { name: "6 étoiles sur 6" })).toBeInTheDocument();
    expect(within(final).getByText("Livraisons prévues").nextElementSibling).toHaveTextContent("5");
    expect(within(final).getByText("Livraisons réussies").nextElementSibling).toHaveTextContent("5");
    const total = plan.tours.flatMap((tour) => tour.orders).reduce((sum, value) => sum + value, 0);
    expect(within(final).getByText("Pizzas livrées").nextElementSibling).toHaveTextContent(String(total));
    // Sept questions de chargement et de livraison, plus une question de bilan par tournée.
    expect(within(final).getByText("Questions réussies").nextElementSibling).toHaveTextContent("9 sur 9, dont 9 du premier coup");
    expect(controllerMock.handOver).toHaveBeenCalledTimes(5);

    // Rejouer : nouvelle partie depuis le restaurant, avec d'autres commandes.
    fireEvent.click(screen.getByRole("button", { name: "Rejouer avec de nouvelles commandes" }));
    expect(controllerMock.reset).toHaveBeenCalledOnce();
    const again = screen.getByRole("dialog", { name: "Tournée 1 — Préparation" });
    expect(within(again).getByText(planGame(seedOf(RANDOMS[1])).tours[0].load.prompt as string)).toBeInTheDocument();
  });

  it("LIVRER : invisible en route, absent devant une autre maison, disparaît au départ, un seul clic compte", async () => {
    const plan = planGame(seedOf(RANDOMS[0]));
    const h1 = MISSION_ADDRESSES[0];
    render(<LeoLivreurPrototypePage startInDrivingMode />);
    push({});
    fireEvent.click(screen.getByRole("button", { name: "Commencer" }));
    answer(plan.tours[0].load.answer);
    fireEvent.click(screen.getByRole("button", { name: "Partir" }));

    push({ phase: "DRIVING", speedKmh: 30 });
    expect(deliverButton()).not.toBeInTheDocument();
    // Arrêté devant une autre maison : la scène ne signale pas d'arrivée pour la destination en cours.
    push({ phase: "ARRIVED", speedKmh: 0, targetLabel: MISSION_ADDRESSES[1].label });
    expect(deliverButton()).not.toBeInTheDocument();
    push({ phase: "ARRIVED", targetLabel: h1.label, remainingMeters: 0 });
    expect(deliverButton()).toBeInTheDocument();
    // Léo repart : le bouton disparaît, la maison reste la destination.
    push({ phase: "DRIVING", speedKmh: 8, remainingMeters: 20 });
    expect(deliverButton()).not.toBeInTheDocument();
    expect(screen.getByText(`Livraison en cours : ${h1.label}`)).toBeInTheDocument();
    // Retour dans la zone, double clic rapide : une seule remise, une seule question.
    push({ phase: "ARRIVED", speedKmh: 0, remainingMeters: 0 });
    const button = deliverButton() as HTMLElement;
    fireEvent.click(button);
    fireEvent.click(button);
    await screen.findByRole("dialog", { name: `Livraison — ${h1.label}` });
    expect(controllerMock.handOver).toHaveBeenCalledOnce();
    expect(deliverButton()).not.toBeInTheDocument();
    expect(controllerMock.lockDriving).toHaveBeenCalled();
  });

  it("aide après les erreurs : encouragement, indice, puis méthode ; sons discrets ; la partie continue", async () => {
    const plan = planGame(seedOf(RANDOMS[0]));
    const question = plan.tours[0].load;
    render(<LeoLivreurPrototypePage startInDrivingMode />);
    push({});
    fireEvent.click(screen.getByRole("button", { name: "Commencer" }));
    const wrong = question.answer + 1;
    answer(wrong);
    expect(within(dialog()).getByText(/Relis bien l'énoncé et réessaie/)).toBeInTheDocument();
    answer(wrong);
    expect(within(dialog()).getByText(question.hint)).toBeInTheDocument();
    answer(wrong);
    expect(within(dialog()).getByText("Regardons ensemble :")).toBeInTheDocument();
    for (const step of question.steps) expect(within(dialog()).getByText(step)).toBeInTheDocument();
    expect(controllerMock.cue.mock.calls.map(([kind]) => kind)).toEqual(["retry", "retry", "retry"]);
    answer(question.answer);
    expect(controllerMock.cue).toHaveBeenLastCalledWith("correct");
    expect(screen.getByRole("button", { name: "Partir" })).toBeInTheDocument();
  });

  it("se joue aussi au clavier de l'ordinateur : chiffres, Effacer et Entrée", () => {
    const plan = planGame(seedOf(RANDOMS[0]));
    render(<LeoLivreurPrototypePage startInDrivingMode />);
    push({});
    fireEvent.click(screen.getByRole("button", { name: "Commencer" }));
    fireEvent.keyDown(window, { key: "9" });
    fireEvent.keyDown(window, { key: "Backspace" });
    for (const digit of String(plan.tours[0].load.answer)) fireEvent.keyDown(window, { key: digit });
    expect(within(dialog()).getByLabelText("Ta réponse")).toHaveTextContent(String(plan.tours[0].load.answer));
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByRole("button", { name: "Partir" })).toBeInTheDocument();
  });
});

// Styles lus tels quels (fins de ligne Unix) : placement et dimensions de la fenêtre sont des règles CSS.
const rawCss = (pattern: Record<string, unknown>) => (Object.values(pattern)[0] as string).replace(/\r\n/g, "\n");
const windowCss = rawCss(import.meta.glob("./LeoMissionWindow.module.css", { query: "?raw", import: "default", eager: true }));
const padCss = rawCss(import.meta.glob("./LeoAnswerPad.module.css", { query: "?raw", import: "default", eager: true }));
const pageCss = rawCss(import.meta.glob("./LeoLivreurPrototypePage.module.css", { query: "?raw", import: "default", eager: true }));
const playerCss = rawCss(import.meta.glob("../../games/leo-driving/LeoDrivingPlayer.module.css", { query: "?raw", import: "default", eager: true }));

describe("fenêtres pédagogiques compactes (LEO-UI-QUIZ-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    current = base;
    let call = 0;
    vi.spyOn(Math, "random").mockImplementation(() => RANDOMS[Math.min(call++, RANDOMS.length - 1)]);
  });
  afterEach(() => vi.restoreAllMocks());

  const openRestaurant = () => {
    render(<LeoLivreurPrototypePage startInDrivingMode />);
    push({});
    fireEvent.click(screen.getByRole("button", { name: "Commencer" }));
    return screen.getByRole("dialog", { name: "Tournée 1 — Préparation" });
  };

  it("présente les commandes en lignes compactes et la question courte, sans répéter les commandes dans une phrase", () => {
    const plan = planGame(seedOf(RANDOMS[0]));
    const restaurant = openRestaurant();
    const list = within(restaurant).getByRole("list", { name: "Commandes" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(restaurant).getByText(plan.tours[0].load.prompt as string)).toBeInTheDocument();
    expect(within(restaurant).queryByText(plan.tours[0].load.text)).not.toBeInTheDocument();
    // Toutes les questions de chargement ont leur question courte ; les règles et les réponses ne changent pas.
    for (let seed = 1; seed <= 50; seed += 1) {
      for (const tour of planGame(seed).tours) {
        expect(tour.load.prompt).toMatch(/^Combien de pizzas Léo doit-il charger/);
        expect(tour.load.answer).toBe(tour.orders.reduce((sum, value) => sum + value, 0));
      }
    }
  });

  it("prend le focus à l'ouverture, se nomme par son titre et désactive Valider tant que la réponse est vide", () => {
    const restaurant = openRestaurant();
    expect(document.activeElement).toBe(restaurant);
    expect(restaurant).toHaveAttribute("aria-modal", "true");
    const submit = within(restaurant).getByRole("button", { name: "Valider" });
    expect(submit).toBeDisabled();
    fireEvent.click(within(restaurant).getByRole("button", { name: "4" }));
    expect(submit).toBeEnabled();
    fireEvent.click(within(restaurant).getByRole("button", { name: "Effacer le dernier chiffre" }));
    expect(submit).toBeDisabled();
  });

  it("Entrée sur une touche qui a le focus ne saisit qu'une fois ; les erreurs sont annoncées", () => {
    const plan = planGame(seedOf(RANDOMS[0]));
    const restaurant = openRestaurant();
    const key = within(restaurant).getByRole("button", { name: "9" });
    key.focus();
    fireEvent.keyDown(key, { key: "Enter" });
    expect(within(restaurant).getByLabelText("Ta réponse")).toHaveTextContent("?");
    fireEvent.click(key);
    fireEvent.click(within(restaurant).getByRole("button", { name: "9" }));
    fireEvent.click(within(restaurant).getByRole("button", { name: "Valider" }));
    expect(plan.tours[0].load.answer).not.toBe(99);
    const status = within(restaurant).getByText(/Relis bien l'énoncé/).closest('[role="status"]');
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("se pose sur la seule zone de la scène, avec une largeur bornée et des touches tactiles d'au moins 44 px", () => {
    expect(pageCss).toMatch(/\.drivingScreen > \.missionInScene \{[^}]*grid-row: 2;/);
    expect(playerCss).toMatch(/\.stage > \.missionInScene \{[^}]*grid-row: 1;/);
    expect(windowCss).toMatch(/width: min\(540px, 90%\);/);
    expect(windowCss).toMatch(/max-height: 100%;/);
    expect(windowCss).toMatch(/container-type: size;/);
    expect(windowCss).toMatch(/prefers-reduced-motion: reduce/);
    expect(padCss).toMatch(/grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
    expect(padCss).toMatch(/\.keys button \{[^}]*min-height: 44px;/);
  });
});

describe("livraisons manquées à l'écran (LEO-DRIVE-FIX-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    current = base;
    let call = 0;
    vi.spyOn(Math, "random").mockImplementation(() => RANDOMS[Math.min(call++, RANDOMS.length - 1)]);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const startDriving = () => {
    const plan = planGame(seedOf(RANDOMS[0]));
    render(<LeoLivreurPrototypePage startInDrivingMode />);
    push({});
    fireEvent.click(screen.getByRole("button", { name: "Commencer" }));
    answer(plan.tours[0].load.answer);
    fireEvent.click(screen.getByRole("button", { name: "Partir" }));
    push({ phase: "DRIVING", speedKmh: 40, remainingMeters: 30 });
    return plan;
  };

  it("maison intermédiaire dépassée : notification non bloquante, prochaine destination, conduite qui continue", () => {
    vi.useFakeTimers();
    const [h1, h2] = MISSION_ADDRESSES;
    const plan = startDriving();
    const load = plan.tours[0].orders.reduce((sum, value) => sum + value, 0);
    controllerMock.lockDriving.mockClear();
    push({ destinationStatus: "passed", targetLabel: h1.label, remainingMeters: 0 });
    const notice = screen.getByText("Livraison manquée !").closest('[role="status"]') as HTMLElement;
    expect(notice).toHaveTextContent(`Tu as dépassé le ${h1.label}`);
    expect(notice).toHaveTextContent(`Prochaine destination : ${h2.label}`);
    // Non bloquante : aucune fenêtre, aucune conduite neutralisée, aucune pizza déduite.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(controllerMock.lockDriving).not.toHaveBeenCalled();
    expect(controllerMock.setDestination).toHaveBeenLastCalledWith(h2.destination);
    const dashboard = within(screen.getByLabelText("Tableau de bord"));
    expect(dashboard.getByText(String(load))).toBeInTheDocument();
    // Tant que la scène signale la maison dépassée, aucune distance positive n'est affichée.
    expect(dashboard.getByText("Manquée")).toBeInTheDocument();
    push({ destinationStatus: "ahead", targetLabel: h2.label, remainingMeters: 340 });
    expect(dashboard.getByText("0,34 km")).toBeInTheDocument();
    expect(screen.getByText(`Livraison en cours : ${h2.label}`)).toBeInTheDocument();
    // La notification s'efface seule.
    act(() => vi.advanceTimersByTime(NOTICE_DURATION_MS + 10));
    expect(screen.queryByText("Livraison manquée !")).not.toBeInTheDocument();
  });

  it("dernière maison dépassée : conduite arrêtée, question des pizzas restantes, bilan conduite et mathématiques", () => {
    const [h1, h2] = MISSION_ADDRESSES;
    const plan = startDriving();
    const load = plan.tours[0].orders.reduce((sum, value) => sum + value, 0);
    push({ destinationStatus: "passed", targetLabel: h1.label });
    push({ destinationStatus: "passed", targetLabel: h2.label });
    const closing = screen.getByRole("dialog", { name: "Tournée 1 — Bilan des pizzas" });
    expect(controllerMock.lockDriving).toHaveBeenCalled();
    expect(within(closing).getByText(/Il a manqué/)).toBeInTheDocument();
    expect(within(screen.getByLabelText("Tableau de bord")).getByText("Manquée")).toBeInTheDocument();
    answer(load);
    fireEvent.click(screen.getByRole("button", { name: "Voir le bilan de la tournée" }));
    const summary = screen.getByRole("dialog", { name: "Bilan de la tournée 1" });
    expect(within(summary).getByText("Livraisons prévues").nextElementSibling).toHaveTextContent("2");
    expect(within(summary).getByText("Livraisons réussies").nextElementSibling).toHaveTextContent("0");
    expect(within(summary).getByText("Livraisons manquées").nextElementSibling).toHaveTextContent("2");
    expect(within(summary).getByText("Pizzas restantes").nextElementSibling).toHaveTextContent(String(load));
    // Les étoiles ne mesurent que les mathématiques : chargement et bilan réussis du premier coup.
    expect(within(summary).getByRole("img", { name: "3 étoiles sur 3" })).toBeInTheDocument();
    expect(controllerMock.handOver).not.toHaveBeenCalled();
  });
});

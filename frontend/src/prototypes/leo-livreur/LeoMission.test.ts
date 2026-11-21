import { describe, expect, it } from "vitest";

import { MAIN_LANE_Y, START_POSITION, isInsideDestination } from "./leoGeometry";
import {
  currentAddress,
  currentQuestion,
  formatKm,
  formatRemaining,
  helpLevel,
  initialMission,
  MISSION_ADDRESSES,
  missionReducer,
  planGame,
  starsFor,
  tourSummary,
  TOUR_ADDRESSES,
  type AddressId,
  type MissionAction,
  type MissionState,
} from "./leoMission";
import { DELIVERY_TEMPLATE_NAMES, isCorrect, parseAnswer, remainingStockQuestion, type LeoQuestion } from "./leoQuestions";
import {
  advanceOdometer,
  createOdometer,
  destinationProgress,
  MAIN_ROAD_NETWORK,
  moveOdometerAnchor,
  ODOMETER_STEP,
  passedInOrder,
  roadDistance,
  signedRoadOffset,
  type RoadNetwork,
} from "./leoRoute";
import { VEHICLE_LENGTH } from "./leoGeometry";
import { metersToPx, pxToMeters } from "./leoUnits";
import { zoneForWorldX } from "./leoWorldZones";

const run = (state: MissionState, ...actions: MissionAction[]) => actions.reduce(missionReducer, state);
const answerOf = (state: MissionState) => String(currentQuestion(state)?.answer);

/**
 * Joue une partie entière sans erreur de calcul ; les maisons de `missed` sont dépassées sans s'arrêter. Renvoie l'état
 * final, les stocks observés après chaque événement et les questions de bilan posées.
 */
function playWholeGame(seed: number, missed: readonly AddressId[] = []) {
  let state = run(initialMission(seed), { type: "open-restaurant" });
  const stocks: number[] = [];
  const closings: LeoQuestion[] = [];
  for (let tour = 0; tour < 2; tour += 1) {
    state = run(state, { type: "answer", value: answerOf(state) }, { type: "depart", meters: 1000 * tour });
    stocks.push(state.stock);
    for (let stop = 0; stop < TOUR_ADDRESSES[tour].length; stop += 1) {
      const id = currentAddress(state).id;
      if (missed.includes(id)) {
        state = run(state, { type: "passed", ids: [id] });
      } else {
        state = run(state, { type: "deliver", stoppedAt: id }, { type: "handover-done" });
        state = run(state, { type: "answer", value: answerOf(state) }, { type: "continue", meters: 1000 * tour + 800 });
      }
      stocks.push(state.stock);
    }
    // Fin de tournée : la conduite est arrêtée, la question sur les pizzas restantes est posée.
    expect(state.stage).toBe("stock-question");
    closings.push(currentQuestion(state) as LeoQuestion);
    state = run(state, { type: "answer", value: answerOf(state) }, { type: "continue", meters: 1000 * tour + 800 }, { type: "next-tour" });
    if (state.stage === "returning") state = run(state, { type: "returned" });
  }
  return { state, stocks, closings };
}

describe("réseau routier : distance restante", () => {
  it("suit la chaussée principale, dans les deux sens", () => {
    const target = { x: 20_000, y: MAIN_LANE_Y };
    expect(roadDistance(MAIN_ROAD_NETWORK, { x: 12_000, y: MAIN_LANE_Y }, target)).toBeCloseTo(8_000, 3);
    expect(roadDistance(MAIN_ROAD_NETWORK, { x: 25_000, y: MAIN_LANE_Y - 50 }, target)).toBeCloseTo(5_000, 3);
  });

  it("emprunte le chemin routier, jamais la ligne droite, et choisit le plus court", () => {
    // Une route en U : les deux bouts sont proches à vol d'oiseau, mais il faut faire le tour.
    const detour: RoadNetwork = {
      nodes: [
        { id: "a", x: 0, y: 0 },
        { id: "b", x: 0, y: 1000 },
        { id: "c", x: 100, y: 1000 },
        { id: "d", x: 100, y: 0 },
      ],
      segments: [["a", "b"], ["b", "c"], ["c", "d"]],
    };
    expect(roadDistance(detour, { x: 0, y: 100 }, { x: 100, y: 100 })).toBe(900 + 100 + 900);
    // Un raccourci ajouté devient le plus court chemin.
    const withShortcut: RoadNetwork = { ...detour, segments: [...detour.segments, ["a", "d"]] };
    expect(roadDistance(withShortcut, { x: 0, y: 100 }, { x: 100, y: 100 })).toBe(100 + 100 + 100);
  });
});

describe("odomètre", () => {
  it("compte le déplacement réel, en avant comme en arrière, et rien à l'arrêt", () => {
    let odometer = createOdometer(0, 0);
    odometer = advanceOdometer(odometer, metersToPx(10), 0);
    expect(pxToMeters(odometer.total)).toBeCloseTo(10);
    odometer = advanceOdometer(odometer, metersToPx(4), 0);
    expect(pxToMeters(odometer.total)).toBeCloseTo(16);
    for (let frame = 0; frame < 100; frame += 1) odometer = advanceOdometer(odometer, metersToPx(4), 0);
    expect(pxToMeters(odometer.total)).toBeCloseTo(16);
  });

  it("n'ajoute aucun kilomètre fictif quand Léo rebondit contre un obstacle", () => {
    let odometer = createOdometer(1000, 0);
    for (let frame = 0; frame < 2000; frame += 1) odometer = advanceOdometer(odometer, 1000 + (frame % 2) * 3, 0);
    expect(odometer.total).toBe(0);
    expect(ODOMETER_STEP).toBeGreaterThan(3);
  });

  it("ne compte pas un déplacement sans conduite (retour automatique au restaurant)", () => {
    let odometer = advanceOdometer(createOdometer(0, 0), metersToPx(50), 0);
    odometer = moveOdometerAnchor(odometer, 0, 0);
    expect(pxToMeters(odometer.total)).toBeCloseTo(50);
    odometer = advanceOdometer(odometer, metersToPx(2), 0);
    expect(pxToMeters(odometer.total)).toBeCloseTo(52);
  });
});

describe("adresses de la mission", () => {
  it("cinq maisons réelles, de plus en plus loin du restaurant, aux distances de conception", () => {
    const km = MISSION_ADDRESSES.map(({ destination }) => pxToMeters(roadDistance(MAIN_ROAD_NETWORK, START_POSITION, destination.stop)) / 1000);
    expect(km.map((value) => Math.round(value * 100) / 100)).toEqual([0.8, 1.14, 1.5, 1.92, 2.45]);
    expect(MISSION_ADDRESSES.map(({ destination }) => zoneForWorldX(destination.house.x).kind)).toEqual([
      "residential",
      "residential",
      "market",
      "school",
      "residential",
    ]);
  });

  it("le numéro de l'adresse est celui de la maison, du côté de Léo", () => {
    for (const address of MISSION_ADDRESSES) {
      expect(address.destination.id).toBe(`house-${address.number}`);
      expect(address.number % 2).toBe(0);
      expect(address.label).toBe(`${address.number}, ${address.street}`);
    }
  });

  it("deux adresses ne se confondent jamais : leurs zones d'arrêt sont disjointes", () => {
    for (const a of MISSION_ADDRESSES) {
      for (const b of MISSION_ADDRESSES) {
        if (a !== b) expect(isInsideDestination(b.destination.stop.x, b.destination.stop.y, a.destination)).toBe(false);
      }
    }
  });
});

describe("questions", () => {
  it("toutes les réponses sont exactes, entières et positives, sur 300 parties", () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const plan = planGame(seed);
      for (const tour of plan.tours) {
        const total = tour.orders.reduce((sum, value) => sum + value, 0);
        expect(tour.load.answer).toBe(total);
        for (const question of [tour.load, ...tour.deliveries]) {
          expect(Number.isInteger(question.answer)).toBe(true);
          expect(question.answer).toBeGreaterThanOrEqual(0);
          expect(question.answer).toBeLessThanOrEqual(60);
          expect(question.steps.join(" ")).toContain(String(question.answer));
          expect(question.hint).not.toContain(`= ${question.answer}`);
          // Chaque phrase commence par une majuscule (noms de clients compris).
          for (const sentence of question.text.split(/(?<=[.?]) /)) expect(sentence.charAt(0)).toMatch(/[A-ZÀ-Ý0-9]/);
        }
      }
      expect(plan.tours[0].orders[0]).toBe(plan.tours[0].orders[1]);
      expect(new Set(plan.tours[1].orders).size).toBe(3);
    }
  });

  it("sept questions par partie, sans répéter le modèle de la question précédente", () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const plan = planGame(seed);
      const deliveries = plan.tours.flatMap((tour) => tour.deliveries);
      expect(plan.tours.length + deliveries.length).toBe(7);
      for (let index = 1; index < deliveries.length; index += 1) {
        expect(deliveries[index].template).not.toBe(deliveries[index - 1].template);
      }
    }
  });

  it("changent d'une partie à l'autre, mais une même graine rejoue la même partie", () => {
    const texts = (seed: number) => planGame(seed).tours.flatMap((tour) => [tour.load, ...tour.deliveries].map(({ text }) => text)).join("|");
    expect(texts(42)).toBe(texts(42));
    const distinct = new Set(Array.from({ length: 20 }, (_, seed) => texts(seed + 1)));
    expect(distinct.size).toBeGreaterThan(15);
    const templates = new Set(Array.from({ length: 100 }, (_, seed) => planGame(seed).tours.flatMap((tour) => tour.deliveries.map(({ template }) => template))).flat());
    expect([...templates].sort()).toEqual([...DELIVERY_TEMPLATE_NAMES].sort());
  });

  it("vérifie les réponses de façon stricte et déterministe", () => {
    const question = planGame(7).tours[0].load;
    expect(isCorrect(question, String(question.answer))).toBe(true);
    expect(isCorrect(question, ` ${question.answer} `)).toBe(true);
    expect(isCorrect(question, String(question.answer + 1))).toBe(false);
    expect(parseAnswer("")).toBeNull();
    expect(parseAnswer("-3")).toBeNull();
    expect(parseAnswer("2.5")).toBeNull();
    expect(parseAnswer("douze")).toBeNull();
  });
});

describe("déroulé de la mission", () => {
  it("les deux tournées se terminent, avec un stock toujours cohérent et jamais négatif", () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const { state, stocks } = playWholeGame(seed);
      expect(state.stage).toBe("final");
      expect(state.delivered).toEqual(["H1", "H2", "H3", "H4", "H5"]);
      expect(stocks.every((stock) => stock >= 0)).toBe(true);
      const [t1, t2] = state.plan.tours.map((tour) => tour.orders);
      expect(stocks).toEqual([t1[0] + t1[1], t1[1], 0, t2[0] + t2[1] + t2[2], t2[1] + t2[2], t2[2], 0]);
      expect(state.pizzasDelivered).toBe([...t1, ...t2].reduce((sum, value) => sum + value, 0));
      // Sept questions de chargement et de livraison, plus une question de bilan par tournée.
      expect(state.results).toHaveLength(9);
    }
  });

  it("LIVRER n'agit que devant la bonne maison, pendant la conduite", () => {
    let state = run(initialMission(3), { type: "open-restaurant" });
    expect(run(state, { type: "deliver", stoppedAt: "H1" }).stage).toBe("restaurant");
    state = run(state, { type: "answer", value: answerOf(state) }, { type: "depart", meters: 0 });
    expect(run(state, { type: "deliver", stoppedAt: null }).stage).toBe("driving");
    expect(run(state, { type: "deliver", stoppedAt: "H2" }).stage).toBe("driving");
    expect(run(state, { type: "deliver", stoppedAt: "H1" }).stage).toBe("handover");
  });

  it("une livraison n'est jamais validée ni déduite deux fois, même avec des clics répétés", () => {
    let state = run(initialMission(5), { type: "open-restaurant" });
    state = run(state, { type: "answer", value: answerOf(state) }, { type: "depart", meters: 0 });
    const loaded = state.stock;
    const give = state.plan.tours[0].orders[0];
    const answer = answerOf(run(state, { type: "deliver", stoppedAt: "H1" }, { type: "handover-done" }));
    state = run(
      state,
      { type: "deliver", stoppedAt: "H1" },
      { type: "deliver", stoppedAt: "H1" },
      { type: "handover-done" },
      { type: "handover-done" },
      { type: "answer", value: answer },
      { type: "answer", value: answer },
      { type: "deliver", stoppedAt: "H1" },
    );
    expect(state.stock).toBe(loaded - give);
    expect(state.delivered).toEqual(["H1"]);
    expect(state.results.filter(({ id }) => id === "t1-livraison-1")).toHaveLength(1);
    // Après Continuer, la destination suivante est H2 : H1 ne peut plus être livrée.
    state = run(state, { type: "continue", meters: 0 }, { type: "deliver", stoppedAt: "H1" });
    expect(state.stage).toBe("driving");
    expect(currentAddress(state).id).toBe("H2");
  });

  it("une erreur encourage, la deuxième donne un indice, la troisième explique ; on peut toujours finir", () => {
    let state = run(initialMission(9), { type: "open-restaurant" });
    const right = answerOf(state);
    const wrong = String(Number(right) + 1);
    expect(helpLevel(state)).toBe(0);
    state = run(state, { type: "answer", value: wrong });
    expect(helpLevel(state)).toBe(1);
    state = run(state, { type: "answer", value: wrong });
    expect(helpLevel(state)).toBe(2);
    state = run(state, { type: "answer", value: wrong }, { type: "answer", value: wrong });
    expect(helpLevel(state)).toBe(3);
    // Une saisie vide n'est pas une erreur.
    expect(run(state, { type: "answer", value: "" }).wrong).toBe(state.wrong);
    state = run(state, { type: "answer", value: right });
    expect(state.stage).toBe("loaded");
    expect(state.results[0].wrong).toBe(4);
  });
});

describe("étoiles et bilans", () => {
  it("trois étoiles au plus par tournée, sans punir excessivement les erreurs", () => {
    const results = (...wrongs: number[]) => wrongs.map((wrong, index) => ({ id: String(index), tour: 0, wrong }));
    expect(starsFor(results(0, 0, 0))).toBe(3);
    expect(starsFor(results(0, 1, 0))).toBe(3);
    expect(starsFor(results(1, 1, 0))).toBe(2);
    expect(starsFor(results(3, 3, 3))).toBe(1);
  });

  it("le bilan donne maisons, pizzas, distance de la tournée, questions et étoiles (six au maximum)", () => {
    const { state } = playWholeGame(11);
    const summaries = [tourSummary(state, 0), tourSummary(state, 1)];
    expect(summaries.map(({ houses }) => houses)).toEqual([2, 3]);
    expect(summaries.map(({ missed }) => missed)).toEqual([0, 0]);
    expect(summaries.map(({ remaining }) => remaining)).toEqual([0, 0]);
    expect(summaries.map(({ questions }) => questions)).toEqual([4, 5]);
    expect(summaries.map(({ meters }) => meters)).toEqual([800, 800]);
    expect(summaries.reduce((sum, { stars }) => sum + stars, 0)).toBe(6);
  });

  it("affiche les kilomètres à la française, jamais négatifs", () => {
    expect(formatKm(1350)).toBe("1,35 km");
    expect(formatKm(0)).toBe("0,00 km");
    expect(formatKm(-20)).toBe("0,00 km");
    // Distance restante : au mètre près dans les 100 derniers mètres.
    expect(formatRemaining(250)).toBe("0,25 km");
    expect(formatRemaining(100)).toBe("0,10 km");
    expect(formatRemaining(45)).toBe("45 m");
    expect(formatRemaining(0)).toBe("0 m");
    expect(formatRemaining(-3)).toBe("0 m");
  });
});

describe("distance jusqu'à la destination (LEO-DRIVE-FIX-01)", () => {
  const [h1, h2] = MISSION_ADDRESSES.map(({ destination }) => destination);
  const at = (x: number) => ({ x, y: MAIN_LANE_Y });
  const progress = (x: number, target = h1) => destinationProgress(MAIN_ROAD_NETWORK, at(x), target, VEHICLE_LENGTH);

  it("distance signée : positive devant Léo, négative derrière", () => {
    expect(signedRoadOffset(MAIN_ROAD_NETWORK, at(1_000), at(1_500))).toBeCloseTo(500, 3);
    expect(signedRoadOffset(MAIN_ROAD_NETWORK, at(1_500), at(1_000))).toBeCloseTo(-500, 3);
  });

  it("compte jusqu'à l'entrée de la zone, puis 0 dans la zone, sans jamais devenir négative", () => {
    const entry = h1.stop.x - h1.radius;
    expect(progress(entry - metersToPx(30)).status).toBe("ahead");
    expect(pxToMeters(progress(entry - metersToPx(30)).remainingPx)).toBeCloseTo(30, 3);
    expect(progress(entry).status).toBe("zone");
    expect(progress(entry).remainingPx).toBe(0);
    expect(progress(h1.stop.x).status).toBe("zone");
    // Centre de Léo après la zone, arrière encore dedans : pas encore dépassée, et aucune distance positive.
    const leaving = progress(h1.stop.x + h1.radius + VEHICLE_LENGTH / 4);
    expect(leaving.status).toBe("zone");
    expect(leaving.remainingPx).toBe(0);
  });

  it("dépassée seulement quand l'arrière de la voiture a franchi la fin de la zone ; jamais présentée devant", () => {
    const rearOut = h1.stop.x + h1.radius + VEHICLE_LENGTH / 2;
    expect(progress(rearOut - 1).status).toBe("zone");
    const passed = progress(rearOut + 1);
    expect(passed.status).toBe("passed");
    expect(passed.remainingPx).toBe(0);
    expect(passed.offsetPx).toBeLessThan(0);
  });

  it("détecte un dépassement d'un seul bond, sans position intermédiaire dans la zone", () => {
    expect(progress(h1.stop.x - metersToPx(200)).status).toBe("ahead");
    expect(progress(h1.stop.x + metersToPx(200)).status).toBe("passed");
  });

  it("plusieurs zones franchies d'un coup : comptées dans l'ordre, jamais une maison plus loin avant la précédente", () => {
    const targets = [h1, h2];
    expect(passedInOrder(MAIN_ROAD_NETWORK, at(h1.stop.x - 500), targets, VEHICLE_LENGTH)).toBe(0);
    expect(passedInOrder(MAIN_ROAD_NETWORK, at(h1.stop.x + 500), targets, VEHICLE_LENGTH)).toBe(1);
    expect(passedInOrder(MAIN_ROAD_NETWORK, at(h2.stop.x + 500), targets, VEHICLE_LENGTH)).toBe(2);
    // Ordre inversé : la première de la liste n'est pas dépassée, rien n'est compté.
    expect(passedInOrder(MAIN_ROAD_NETWORK, at(h1.stop.x + 500), [h2, h1], VEHICLE_LENGTH)).toBe(0);
  });
});

describe("livraisons manquées (LEO-DRIVE-FIX-01)", () => {
  const departed = (seed: number) => {
    const opened = run(initialMission(seed), { type: "open-restaurant" });
    return run(opened, { type: "answer", value: answerOf(opened) }, { type: "depart", meters: 0 });
  };

  it("une maison intermédiaire manquée : aucune pizza déduite, notification, destination suivante, conduite qui continue", () => {
    const state = departed(4);
    const loaded = state.stock;
    const after = run(state, { type: "passed", ids: ["H1"] });
    expect(after.stage).toBe("driving");
    expect(after.missed).toEqual(["H1"]);
    expect(after.stock).toBe(loaded);
    expect(currentAddress(after).id).toBe("H2");
    expect(after.notice).toEqual({ missed: MISSION_ADDRESSES[0].label, next: MISSION_ADDRESSES[1].label });
    expect(run(after, { type: "dismiss-notice" }).notice).toBeNull();
    // Une maison manquée ne se livre plus, même en revenant devant.
    expect(run(after, { type: "deliver", stoppedAt: "H1" }).stage).toBe("driving");
  });

  it("jamais de double traitement : un même dépassement signalé deux fois, ou une maison hors ordre, ne change rien", () => {
    const state = run(departed(4), { type: "passed", ids: ["H1"] });
    expect(run(state, { type: "passed", ids: ["H1"] })).toBe(state);
    // H2 n'est pas la maison en cours avant H1 : ignorée.
    const fresh = departed(4);
    expect(run(fresh, { type: "passed", ids: ["H2"] })).toBe(fresh);
  });

  it("plusieurs zones franchies d'un coup : traitées dans l'ordre, la dernière ferme la tournée", () => {
    const state = run(departed(4), { type: "passed", ids: ["H1", "H2"] });
    expect(state.missed).toEqual(["H1", "H2"]);
    expect(state.stage).toBe("stock-question");
    expect(state.stock).toBe(state.loaded);
  });

  it("dernière maison manquée : conduite arrêtée, question sur les pizzas restantes (chargées moins livrées)", () => {
    let state = departed(6);
    state = run(state, { type: "deliver", stoppedAt: "H1" }, { type: "handover-done" });
    state = run(state, { type: "answer", value: answerOf(state) }, { type: "continue", meters: 500 });
    const give = state.plan.tours[0].orders[0];
    state = run(state, { type: "passed", ids: ["H2"] });
    expect(state.stage).toBe("stock-question");
    expect(state.notice).toBeNull();
    const closing = currentQuestion(state) as LeoQuestion;
    expect(closing.answer).toBe(state.loaded - give);
    expect(closing.answer).toBe(state.stock);
    expect(closing.text).toMatch(/manqué/);
    state = run(state, { type: "answer", value: String(closing.answer) }, { type: "continue", meters: 900 });
    expect(state.stage).toBe("tour-summary");
    const summary = tourSummary(state, 0);
    expect([summary.planned, summary.houses, summary.missed]).toEqual([2, 1, 1]);
    expect(summary.pizzas).toBe(give);
    expect(summary.remaining).toBe(state.plan.tours[0].orders[1]);
  });

  it("exemple du cahier : 12 chargées, 4 puis 3 livrées, la dernière manquée : il en reste 5", () => {
    const question = remainingStockQuestion("bilan", 12, [
      { client: "Monsieur Mukendi", pizzas: 4, delivered: true },
      { client: "la famille Kabongo", pizzas: 3, delivered: true },
      { client: "Mamie Ngalula", pizzas: 5, delivered: false },
    ]);
    expect(question.answer).toBe(5);
    expect(isCorrect(question, "5")).toBe(true);
    expect(question.steps.join(" ")).toContain("12 − 7 = 5");
  });

  it("toutes les maisons manquées : les pizzas restent toutes dans la voiture, la partie se termine", () => {
    const { state, closings } = playWholeGame(8, ["H1", "H2", "H3", "H4", "H5"]);
    expect(state.stage).toBe("final");
    expect(state.delivered).toEqual([]);
    expect(state.pizzasDelivered).toBe(0);
    const loads = state.plan.tours.map((tour) => tour.orders.reduce((sum, value) => sum + value, 0));
    expect(closings.map(({ answer }) => answer)).toEqual(loads);
  });

  it("parcours mêlé : stock toujours égal aux pizzas chargées moins les pizzas livrées", () => {
    const { state, stocks } = playWholeGame(12, ["H2", "H4"]);
    const [t1, t2] = state.plan.tours.map((tour) => tour.orders);
    expect(stocks).toEqual([
      t1[0] + t1[1], t1[1], t1[1],
      t2[0] + t2[1] + t2[2], t2[1] + t2[2], t2[1] + t2[2], t2[1],
    ]);
    const summaries = [tourSummary(state, 0), tourSummary(state, 1)];
    expect(summaries.map(({ houses, missed }) => [houses, missed])).toEqual([[1, 1], [2, 1]]);
    expect(summaries.map(({ remaining }) => remaining)).toEqual([t1[1], t2[1]]);
  });

  it("les étoiles ne mesurent que les mathématiques : manquer une maison ne coûte aucune étoile", () => {
    const perfect = playWholeGame(15).state;
    const withMisses = playWholeGame(15, ["H1", "H3"]).state;
    expect(tourSummary(perfect, 0).stars).toBe(3);
    expect(tourSummary(withMisses, 0).stars).toBe(3);
    expect(tourSummary(withMisses, 1).stars).toBe(3);
  });
});

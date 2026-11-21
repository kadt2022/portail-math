// Mission de Léo le livreur : adresses, tournées, stock de pizzas, questions et étoiles. Pur (sans Phaser ni React).
//
// Déroulé d'une partie : restaurant (question de chargement) -> conduite -> arrêt devant la bonne maison -> LIVRER ->
// remise des pizzas -> question de livraison -> maison suivante ... -> bilan de tournée -> retour au restaurant ->
// tournée 2 -> bilan final. L'état n'évolue que par `missionReducer` : chaque transition vérifie l'étape en cours,
// si bien qu'un double clic ne peut ni livrer deux fois, ni déduire deux fois le stock.

import { suburbHouse, ZONE1_HOUSE_COUNT, type LeoDestination } from "./leoGeometry";
import {
  applicableTemplates,
  buildDeliveryQuestion,
  deliveryQuestion,
  type DeliveryContext,
  isCorrect,
  loadQuestionEqual,
  loadQuestionSum,
  parseAnswer,
  randomInt,
  remainingStockQuestion,
  seededRandom,
  type LeoQuestion,
  type Order,
} from "./leoQuestions";

export type AddressId = "H1" | "H2" | "H3" | "H4" | "H5";

export interface MissionAddress {
  id: AddressId;
  /** Numéro affiché sur la maison : c'est aussi le numéro de l'adresse. */
  number: number;
  street: string;
  client: string;
  /** Adresse complète, telle que l'enfant la lit. */
  label: string;
  destination: LeoDestination;
}

/**
 * Cinq maisons réelles du quartier qui suit la ville, choisies aux distances de conception (0,8 à 2,5 km du restaurant
 * par la chaussée) et dans un quartier du bon type : marché pour le boulevard du Marché, école (30 km/h) pour l'avenue
 * des Écoles. Toutes du côté de Léo (numéros pairs). Les distances réelles sont vérifiées par les tests.
 */
const ADDRESS_SPECS: ReadonlyArray<Omit<MissionAddress, "label" | "destination">> = [
  { id: "H1", number: 98, street: "avenue des Manguiers", client: "Madame Kalala" },
  { id: "H2", number: 158, street: "rue des Palmiers", client: "la famille Ilunga" },
  { id: "H3", number: 222, street: "boulevard du Marché", client: "Monsieur Mukendi" },
  { id: "H4", number: 296, street: "avenue des Écoles", client: "la famille Kabongo" },
  { id: "H5", number: 388, street: "route des Cascades", client: "Mamie Ngalula" },
];

export const MISSION_ADDRESSES: readonly MissionAddress[] = ADDRESS_SPECS.map((spec) => {
  const label = `${spec.number}, ${spec.street}`;
  const house = suburbHouse(spec.number - ZONE1_HOUSE_COUNT - 1);
  return { ...spec, label, destination: { ...house, label } };
});

export function addressById(id: AddressId) {
  return MISSION_ADDRESSES.find((address) => address.id === id) as MissionAddress;
}

/** Deux tournées : 2 maisons (facile), puis 3 maisons (moyenne). */
export const TOUR_ADDRESSES: readonly (readonly AddressId[])[] = [["H1", "H2"], ["H3", "H4", "H5"]];
export const MAX_STARS_PER_TOUR = 3;

export interface TourPlan {
  addresses: readonly AddressId[];
  /** Pizzas commandées par chaque maison, dans l'ordre de la tournée. */
  orders: readonly number[];
  load: LeoQuestion;
  deliveries: readonly LeoQuestion[];
}

export interface GamePlan {
  seed: number;
  tours: readonly TourPlan[];
}

/** Trois nombres différents entre 2 et 6, dans un ordre tiré au hasard. */
function distinctOrders(random: () => number) {
  const pool = [2, 3, 4, 5, 6];
  const chosen: number[] = [];
  while (chosen.length < 3) chosen.push(pool.splice(randomInt(random, 0, pool.length - 1), 1)[0]);
  return chosen;
}

/** Partie complète tirée d'une graine : commandes, chargements et sept questions. */
export function planGame(seed: number): GamePlan {
  const random = seededRandom(seed);
  const used: string[] = [];
  const each = randomInt(random, 2, 5);
  const ordersByTour = [[each, each], distinctOrders(random)];
  const tours = TOUR_ADDRESSES.map((addresses, tourIndex) => {
    const tour = (tourIndex + 1) as 1 | 2;
    const orders = ordersByTour[tourIndex];
    const named: Order[] = addresses.map((id, index) => {
      const address = addressById(id);
      return { client: address.client, address: address.label, pizzas: orders[index] };
    });
    const load = tour === 1 ? loadQuestionEqual(`t${tour}-chargement`, named, random) : loadQuestionSum(`t${tour}-chargement`, named);
    const contextAt = (index: number): DeliveryContext => ({
      tour,
      client: addressById(addresses[index]).client,
      stock: orders.slice(index).reduce((sum, value) => sum + value, 0),
      give: orders[index],
      next: index + 1 < orders.length ? orders[index + 1] : null,
    });
    const deliveries = addresses.map((_, index) => {
      // La maison suivante n'a qu'un modèle possible : on le lui laisse, pour ne jamais enchaîner deux fois le même.
      const nextOptions = index + 1 < addresses.length ? applicableTemplates(contextAt(index + 1)) : [];
      const reserved = nextOptions.length === 1 ? nextOptions[0] : null;
      const question = deliveryQuestion(`t${tour}-livraison-${index + 1}`, contextAt(index), used, random, reserved);
      used.push(question.template);
      return question;
    });
    return { addresses, orders, load, deliveries };
  });
  return { seed, tours };
}

/** Graine d'une nouvelle partie (hors tests) : chaque partie propose d'autres commandes. */
export function newSeed() {
  return Math.floor(Math.random() * 2 ** 31);
}

// ---------------------------------------------------------------- État de la partie

export type MissionStage =
  /** Avant la mission : bouton Commencer. */
  | "welcome"
  /** Au restaurant : commandes et question de chargement. */
  | "restaurant"
  /** Chargement juste: bouton Partir. */
  | "loaded"
  | "driving"
  /** Animation de remise des pizzas (conduite neutralisée). */
  | "handover"
  /** Question de livraison (conduite neutralisée). */
  | "question"
  /** Fin de tournée (dernière maison livrée ou manquée) : question sur les pizzas restantes, conduite arrêtée. */
  | "stock-question"
  | "tour-summary"
  /** Retour automatique au restaurant entre les deux tournées. */
  | "returning"
  | "final";

export interface QuestionResult {
  id: string;
  tour: number;
  /** Mauvaises réponses avant la bonne. */
  wrong: number;
}

export interface MissionState {
  plan: GamePlan;
  stage: MissionStage;
  tour: number;
  /** Maison en cours dans la tournée. */
  stop: number;
  /** Pizzas dans la voiture. */
  stock: number;
  /** Livraisons validées (identifiants d'adresse) : jamais deux fois la même. */
  delivered: readonly AddressId[];
  /** Maisons dépassées sans livraison : leurs pizzas restent dans la voiture. */
  missed: readonly AddressId[];
  /** Pizzas chargées pour la tournée en cours. */
  loaded: number;
  pizzasDelivered: number;
  /** Livraison manquée à signaler (notification non bloquante), ou null. */
  notice: MissedNotice | null;
  /** Question de fin de tournée sur les pizzas restantes, construite d'après ce qui a vraiment été livré. */
  closing: LeoQuestion | null;
  /** Question de la livraison en cours, fixée quand la remise se termine, d'après le stock réel de la voiture. */
  delivery: LeoQuestion | null;
  /** Mauvaises réponses à la question affichée. */
  wrong: number;
  /** La question affichée est résolue (message de réussite, bouton pour continuer). */
  solved: boolean;
  results: readonly QuestionResult[];
  /** Odomètre (m) au départ du restaurant et à la fin de chaque tournée. */
  tourStartMeters: readonly number[];
  tourEndMeters: readonly number[];
}

export function initialMission(seed: number): MissionState {
  return {
    plan: planGame(seed),
    stage: "welcome",
    tour: 0,
    stop: 0,
    stock: 0,
    delivered: [],
    missed: [],
    loaded: 0,
    pizzasDelivered: 0,
    notice: null,
    closing: null,
    delivery: null,
    wrong: 0,
    solved: false,
    results: [],
    tourStartMeters: [],
    tourEndMeters: [],
  };
}

export type MissionAction =
  | { type: "open-restaurant" }
  | { type: "answer"; value: string }
  | { type: "depart"; meters: number }
  /** Clic sur LIVRER : `stoppedAt` est la maison devant laquelle la scène voit Léo arrêté (ou null). */
  | { type: "deliver"; stoppedAt: AddressId | null }
  | { type: "handover-done" }
  /**
   * La scène voit Léo entièrement au-delà de ces destinations. Traitées dans l'ordre : seule la maison en cours peut
   * être déclarée manquée, puis la suivante, etc. Une maison déjà livrée ou manquée n'est jamais traitée deux fois.
   */
  | { type: "passed"; ids: readonly AddressId[] }
  | { type: "dismiss-notice" }
  | { type: "continue"; meters: number }
  | { type: "next-tour" }
  | { type: "returned" }
  | { type: "replay"; seed: number };

export function currentTour(state: MissionState) {
  return state.plan.tours[state.tour];
}

export function currentAddress(state: MissionState): MissionAddress {
  const tour = currentTour(state);
  return addressById(tour.addresses[Math.min(state.stop, tour.addresses.length - 1)]);
}

/** Question affichée (chargement au restaurant ou livraison), ou null. */
export function currentQuestion(state: MissionState): LeoQuestion | null {
  const tour = currentTour(state);
  if (state.stage === "restaurant") return tour.load;
  if (state.stage === "question") return state.delivery ?? tour.deliveries[state.stop];
  if (state.stage === "stock-question") return state.closing;
  return null;
}

export interface MissedNotice {
  /** Adresse dépassée. */
  missed: string;
  /** Prochaine destination de la tournée. */
  next: string;
}

/** Une maison a-t-elle déjà une issue (livrée ou manquée) ? */
function resolved(state: MissionState, id: AddressId) {
  return state.delivered.includes(id) || state.missed.includes(id);
}

/** Stock de pizzas : chargées moins livrées. Les pizzas d'une maison manquée restent dans la voiture. */
export function pizzaInventory(loaded: number, deliveredPizzas: number) {
  return Math.max(0, loaded - deliveredPizzas);
}

/**
 * Question de la livraison en cours. Le plan l'a préparée en supposant toutes les maisons précédentes livrées : si une
 * maison a été manquée, ses pizzas sont encore dans la voiture et le stock réel diffère. La question est alors refaite
 * avec le même modèle d'exercice et les vrais nombres (énoncé, réponse et méthode d'accord avec le stock), à partir
 * d'une graine dérivée de la partie : une même partie rejouée donne la même question.
 */
export function questionForDelivery(state: MissionState): LeoQuestion {
  const tour = currentTour(state);
  const planned = tour.deliveries[state.stop];
  const plannedStock = tour.orders.slice(state.stop).reduce((sum, value) => sum + value, 0);
  if (state.stock === plannedStock) return planned;
  const context: DeliveryContext = {
    tour: (state.tour + 1) as 1 | 2,
    client: currentAddress(state).client,
    stock: state.stock,
    give: tour.orders[state.stop],
    next: state.stop + 1 < tour.orders.length ? tour.orders[state.stop + 1] : null,
  };
  const random = seededRandom((Math.imul(state.plan.seed, 31) + (state.tour + 1) * 101 + state.stop + 1) >>> 0);
  const same = buildDeliveryQuestion(planned.template, planned.id, context, random);
  if (same) return same;
  const used = state.plan.tours.flatMap(({ deliveries }) => deliveries).map(({ template }) => template).filter((template) => template !== planned.template);
  return deliveryQuestion(planned.id, context, used, random);
}

/** Fin de tournée : la conduite s'arrête et vient la question sur les pizzas restantes. */
function closeTour(state: MissionState): MissionState {
  const tour = currentTour(state);
  const lines = tour.addresses.map((id, index) => ({
    client: addressById(id).client,
    pizzas: tour.orders[index],
    delivered: state.delivered.includes(id),
  }));
  return {
    ...state,
    stage: "stock-question",
    notice: null,
    wrong: 0,
    solved: false,
    closing: remainingStockQuestion(`t${state.tour + 1}-bilan`, state.loaded, lines),
  };
}

/** Niveau d'aide après les erreurs : 0 rien, 1 encouragement, 2 indice, 3 explication guidée. */
export function helpLevel(state: MissionState) {
  return Math.min(state.wrong, 3) as 0 | 1 | 2 | 3;
}

function solve(state: MissionState, question: LeoQuestion): MissionState {
  return { ...state, solved: true, results: [...state.results, { id: question.id, tour: state.tour, wrong: state.wrong }] };
}

export function missionReducer(state: MissionState, action: MissionAction): MissionState {
  switch (action.type) {
    case "open-restaurant":
      return state.stage === "welcome" ? { ...state, stage: "restaurant", wrong: 0, solved: false } : state;

    case "answer": {
      const question = currentQuestion(state);
      if (!question || state.solved || parseAnswer(action.value) === null) return state;
      if (!isCorrect(question, action.value)) return { ...state, wrong: state.wrong + 1 };
      if (state.stage === "restaurant") {
        // Chargement juste : le stock est exactement la somme des commandes de la tournée.
        const load = currentTour(state).orders.reduce((sum, value) => sum + value, 0);
        return { ...solve(state, question), stage: "loaded", stock: load, loaded: load };
      }
      if (state.stage === "stock-question") return solve(state, question);
      // Validation définitive de la livraison : seul endroit où le stock diminue, une seule fois par maison.
      const address = currentAddress(state);
      if (resolved(state, address.id)) return state;
      const give = currentTour(state).orders[state.stop];
      const deliveredThisTour = tourDeliveredPizzas(state) + give;
      return {
        ...solve(state, question),
        stock: pizzaInventory(state.loaded, deliveredThisTour),
        delivered: [...state.delivered, address.id],
        pizzasDelivered: state.pizzasDelivered + give,
      };
    }

    case "depart":
      if (state.stage !== "loaded") return state;
      return { ...state, stage: "driving", stop: 0, wrong: 0, solved: false, tourStartMeters: [...state.tourStartMeters, action.meters] };

    case "deliver": {
      if (state.stage !== "driving") return state;
      const address = currentAddress(state);
      if (action.stoppedAt !== address.id || resolved(state, address.id)) return state;
      return { ...state, stage: "handover", notice: null };
    }

    case "passed": {
      let next = state;
      for (const id of action.ids) {
        if (next.stage !== "driving") break;
        const address = currentAddress(next);
        if (id !== address.id || resolved(next, id)) break;
        const tour = currentTour(next);
        const missed = { ...next, missed: [...next.missed, id] };
        if (next.stop + 1 >= tour.addresses.length) {
          next = closeTour(missed);
        } else {
          const following = addressById(tour.addresses[next.stop + 1]);
          next = { ...missed, stop: next.stop + 1, notice: { missed: address.label, next: following.label } };
        }
      }
      return next;
    }

    case "dismiss-notice":
      return state.notice ? { ...state, notice: null } : state;

    case "handover-done":
      return state.stage === "handover" ? { ...state, stage: "question", wrong: 0, solved: false, delivery: questionForDelivery(state) } : state;

    case "continue": {
      if (!state.solved) return state;
      if (state.stage === "stock-question") {
        return { ...state, stage: "tour-summary", tourEndMeters: [...state.tourEndMeters, action.meters] };
      }
      if (state.stage !== "question") return state;
      const tour = currentTour(state);
      if (state.stop + 1 < tour.addresses.length) return { ...state, stage: "driving", stop: state.stop + 1, wrong: 0, solved: false };
      return closeTour(state);
    }

    case "next-tour":
      if (state.stage !== "tour-summary") return state;
      return state.tour + 1 < state.plan.tours.length ? { ...state, stage: "returning" } : { ...state, stage: "final" };

    case "returned":
      if (state.stage !== "returning") return state;
      return { ...state, stage: "restaurant", tour: state.tour + 1, stop: 0, stock: 0, loaded: 0, wrong: 0, solved: false, notice: null, closing: null };

    case "replay":
      return initialMission(action.seed);
  }
}

// ---------------------------------------------------------------- Bilans

/**
 * Étoiles d'une tournée (1 à 3) : une réussite du premier coup vaut 2 points, du deuxième coup 1 point. Trois étoiles
 * jusqu'à une seule question réussie au deuxième essai, deux à partir de la moitié des points ; finir la tournée en
 * rapporte toujours au moins une. Les erreurs ne sont jamais punies plus que cela.
 */
export function starsFor(results: readonly QuestionResult[]) {
  if (results.length === 0) return 0;
  const points = results.reduce((sum, { wrong }) => sum + (wrong === 0 ? 2 : wrong === 1 ? 1 : 0), 0);
  const max = results.length * 2;
  if (points >= max - 1) return 3;
  if (points >= results.length) return 2;
  return 1;
}

/** Pizzas livrées pendant la tournée en cours. */
function tourDeliveredPizzas(state: MissionState) {
  const tour = currentTour(state);
  return tour.addresses.reduce((sum, id, index) => sum + (state.delivered.includes(id) ? tour.orders[index] : 0), 0);
}

/**
 * Bilan d'une tournée, en deux parts distinctes : la conduite (livraisons prévues, réussies, manquées, pizzas livrées
 * et restantes, distance) et les mathématiques (questions réussies). Les étoiles ne mesurent que les mathématiques :
 * une maison manquée n'est pas une erreur de calcul.
 */
export interface TourSummary {
  tour: number;
  /** Livraisons prévues. */
  planned: number;
  /** Livraisons réussies. */
  houses: number;
  /** Livraisons manquées. */
  missed: number;
  /** Pizzas livrées. */
  pizzas: number;
  /** Pizzas restées dans la voiture (chargées - livrées). */
  remaining: number;
  meters: number;
  /** Questions de mathématiques réussies (toutes le sont avant de continuer). */
  questions: number;
  firstTry: number;
  stars: number;
}

export function tourSummary(state: MissionState, tour: number): TourSummary {
  const plan = state.plan.tours[tour];
  const results = state.results.filter((result) => result.tour === tour);
  const delivered = plan.addresses.filter((id) => state.delivered.includes(id));
  const missed = plan.addresses.filter((id) => state.missed.includes(id));
  const pizzasDelivered = plan.addresses.reduce((sum, id, index) => sum + (state.delivered.includes(id) ? plan.orders[index] : 0), 0);
  const loaded = plan.orders.reduce((sum, value) => sum + value, 0);
  const start = state.tourStartMeters[tour] ?? 0;
  const finished = state.tourEndMeters[tour] !== undefined;
  const end = state.tourEndMeters[tour] ?? start;
  return {
    tour,
    planned: plan.addresses.length,
    houses: delivered.length,
    missed: missed.length,
    pizzas: pizzasDelivered,
    remaining: pizzaInventory(loaded, pizzasDelivered),
    meters: Math.max(0, end - start),
    questions: results.length,
    firstTry: results.filter(({ wrong }) => wrong === 0).length,
    stars: finished ? starsFor(results) : 0,
  };
}

/** Distance (m) en km, à la française, avec deux décimales : « 1,35 km ». Jamais négative. */
export function formatKm(meters: number) {
  return `${(Math.max(0, meters) / 1000).toFixed(2).replace(".", ",")} km`;
}

/** Seuil sous lequel la distance restante passe en mètres. */
export const METERS_DISPLAY_BELOW = 100;

/**
 * Distance restante : en km au loin, en mètres dans les 100 derniers mètres (« 45 m »), pour pouvoir s'arrêter dans
 * la zone de livraison (quelques mètres) en lisant le compteur. Jamais négative.
 */
export function formatRemaining(meters: number) {
  const value = Math.max(0, Math.round(meters));
  return value < METERS_DISPLAY_BELOW ? `${value} m` : formatKm(value);
}

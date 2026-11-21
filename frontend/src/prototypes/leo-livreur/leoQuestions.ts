// Questions de Léo le livreur : modèles paramétrables, nombres tirés d'une graine. Pur (sans Phaser ni React).
//
// Chaque question porte sa réponse calculée, un indice et une explication guidée. La vérification est un calcul entier
// déterministe : aucune estimation, aucun service extérieur. Une même graine redonne exactement la même partie.

export interface LeoQuestion {
  /** Identifiant stable dans la partie (« t1-chargement », « t2-livraison-3 »...). */
  id: string;
  /** Modèle utilisé : sert à éviter les répétitions immédiates. */
  template: string;
  /** Énoncé complet, en une phrase. */
  text: string;
  /**
   * Question seule, quand les données de l'énoncé sont déjà affichées à côté (liste des commandes au restaurant) :
   * évite de répéter les commandes dans une longue phrase. Absente : on affiche `text`.
   */
  prompt?: string;
  answer: number;
  /** Unité de la réponse, affichée à côté de la saisie. */
  unit: string;
  /** Deuxième erreur : piste de méthode, sans le résultat. */
  hint: string;
  /** Troisième erreur : méthode pas à pas, jusqu'au calcul. */
  steps: string[];
}

/** Générateur pseudo-aléatoire déterministe (mulberry32) : même graine, mêmes nombres. */
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export type Random = () => number;

export function randomInt(random: Random, min: number, max: number) {
  return min + Math.floor(random() * (max - min + 1));
}

export function pick<T>(random: Random, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

/** Lecture stricte d'une réponse : un entier positif écrit en chiffres, sinon null. */
export function parseAnswer(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d{1,4}$/.test(trimmed)) return null;
  return Number(trimmed);
}

export function isCorrect(question: LeoQuestion, input: string) {
  return parseAnswer(input) === question.answer;
}

const pizzas = (count: number) => `${count} pizza${count > 1 ? "s" : ""}`;
/** Majuscule en début de phrase (« la famille Ilunga » -> « La famille Ilunga »). */
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const parts = (count: number) => `${count} part${count > 1 ? "s" : ""}`;

// ---------------------------------------------------------------- Chargement au restaurant

export interface Order {
  client: string;
  address: string;
  pizzas: number;
}

/** Tournée 1 : deux maisons, même commande (multiplication ou addition répétée). */
export function loadQuestionEqual(id: string, orders: readonly Order[], random: Random): LeoQuestion {
  const each = orders[0].pizzas;
  const total = each * orders.length;
  const steps = [
    `Il y a ${orders.length} maisons.`,
    `Chaque maison commande ${pizzas(each)}.`,
    `${orders.length} × ${each} = ${total}, c'est comme ${orders.map(() => each).join(" + ")} = ${total}.`,
    `Léo doit charger ${pizzas(total)}.`,
  ];
  if (random() < 0.5) {
    return {
      id,
      template: "chargement-chacune",
      text: `${orders.length} maisons ont commandé ${pizzas(each)} chacune. Combien de pizzas Léo doit-il charger ?`,
      prompt: "Combien de pizzas Léo doit-il charger ?",
      answer: total,
      unit: "pizzas",
      hint: `Chaque maison veut ${pizzas(each)}. Ajoute la commande de chaque maison, ou multiplie ${each} par le nombre de maisons.`,
      steps,
    };
  }
  return {
    id,
    template: "chargement-autant",
    text: `${capital(orders[0].client)} commande ${pizzas(each)}. ${capital(orders[1].client)} en commande autant. Combien de pizzas Léo doit-il charger pour les deux ?`,
    prompt: "Combien de pizzas Léo doit-il charger pour les deux maisons ?",
    answer: total,
    unit: "pizzas",
    hint: `Les deux maisons veulent le même nombre de pizzas : ${pizzas(each)} chacune. Additionne les deux commandes.`,
    steps,
  };
}

/** Tournée 2 : trois commandes différentes à additionner. */
export function loadQuestionSum(id: string, orders: readonly Order[]): LeoQuestion {
  const values = orders.map(({ pizzas: count }) => count);
  const total = values.reduce((sum, value) => sum + value, 0);
  const list = orders.map(({ address, pizzas: count }) => `${address} : ${pizzas(count)}`).join(" ; ");
  const partial = values[0] + values[1];
  return {
    id,
    template: "chargement-somme",
    text: `Commandes de la tournée — ${list}. Combien de pizzas faut-il charger pour satisfaire toutes les commandes ?`,
    prompt: "Combien de pizzas Léo doit-il charger pour toutes les commandes ?",
    answer: total,
    unit: "pizzas",
    hint: "Il faut assez de pizzas pour chaque maison : additionne les trois commandes, deux par deux.",
    steps: [
      `Les commandes sont ${values.join(", ")}.`,
      `D'abord ${values[0]} + ${values[1]} = ${partial}.`,
      `Puis ${partial} + ${values[2]} = ${total}.`,
      `Léo doit charger ${pizzas(total)}.`,
    ],
  };
}

// ---------------------------------------------------------------- Fin de tournée

export interface TourDeliveryLine {
  client: string;
  pizzas: number;
  /** Livraison réussie ; sinon manquée (les pizzas sont restées dans la voiture). */
  delivered: boolean;
}

/**
 * Question de fin de tournée : combien de pizzas reste-t-il ? Construite d'après les livraisons réellement faites
 * (réussies ou manquées). Réponse : chargées - livrées ; les pizzas des maisons manquées restent dans la voiture.
 */
export function remainingStockQuestion(id: string, loaded: number, lines: readonly TourDeliveryLine[]): LeoQuestion {
  const done = lines.filter(({ delivered }) => delivered);
  const missed = lines.filter(({ delivered }) => !delivered);
  const given = done.reduce((sum, { pizzas: count }) => sum + count, 0);
  const left = loaded - given;
  const deliveredText = done.length === 0
    ? "Il n'a livré aucune maison."
    : `Il en a livré ${done.map(({ pizzas: count, client }) => `${count} à ${client}`).join(", puis ")}.`;
  const missedText = missed.length === 0 ? "" : ` Il a manqué ${missed.map(({ client }) => `la livraison de ${client}`).join(" et ")}.`;
  const sum = done.length > 1 ? `${done.map(({ pizzas: count }) => count).join(" + ")} = ${given}` : `${given}`;
  return {
    id,
    template: "bilan-stock",
    text: `Léo avait chargé ${pizzas(loaded)}. ${deliveredText}${missedText} Combien de pizzas lui reste-t-il ?`,
    answer: left,
    unit: "pizzas",
    hint: "Pars des pizzas chargées et enlève seulement celles qui ont été livrées : celles des maisons manquées sont toujours dans la voiture.",
    steps: [
      `Pizzas chargées : ${loaded}.`,
      `Pizzas livrées : ${sum}.`,
      `${loaded} − ${given} = ${left}.`,
      `Il reste ${pizzas(left)} dans la voiture.`,
    ],
  };
}

// ---------------------------------------------------------------- Livraison

export interface DeliveryContext {
  /** 1 (facile) ou 2 (moyenne). */
  tour: 1 | 2;
  client: string;
  /** Pizzas dans la voiture en arrivant. */
  stock: number;
  /** Pizzas commandées ici. */
  give: number;
  /** Commande de la maison suivante de la tournée, ou null pour la dernière. */
  next: number | null;
}

interface DeliveryTemplate {
  name: string;
  applies(context: DeliveryContext): boolean;
  build(id: string, context: DeliveryContext, random: Random): LeoQuestion;
}

const DELIVERY_TEMPLATES: readonly DeliveryTemplate[] = [
  {
    name: "stock-restant",
    applies: ({ stock, give }) => stock > give,
    build: (id, { stock, give, client }) => ({
      id,
      template: "stock-restant",
      text: `Léo a ${pizzas(stock)} dans sa voiture. Il en remet ${give} à ${client}. Combien lui en reste-t-il ?`,
      answer: stock - give,
      unit: "pizzas",
      hint: `Léo enlève des pizzas de sa voiture : pars de ${stock} et retire ${give}.`,
      steps: [`Au départ, Léo a ${pizzas(stock)}.`, `Il en donne ${give}.`, `${stock} − ${give} = ${stock - give}.`, `Il lui reste ${pizzas(stock - give)}.`],
    }),
  },
  {
    name: "comparaison",
    applies: ({ tour, stock, give }) => tour === 1 && stock > give,
    build: (id, { stock, give, client }) => ({
      id,
      template: "comparaison",
      text: `${capital(client)} a commandé ${pizzas(give)}. Léo en a ${stock} dans sa voiture. Combien de pizzas Léo a-t-il de plus que la commande ?`,
      answer: stock - give,
      unit: "pizzas",
      hint: `Compare les deux nombres : combien faut-il ajouter à ${give} pour arriver à ${stock} ?`,
      steps: [`La commande : ${pizzas(give)}.`, `Dans la voiture : ${pizzas(stock)}.`, `${stock} − ${give} = ${stock - give}.`, `Léo a ${pizzas(stock - give)} de plus que la commande.`],
    }),
  },
  {
    name: "parts",
    applies: ({ give }) => give >= 2,
    build: (id, { tour, give, client }, random) => {
      const perPizza = tour === 1 ? 4 : pick(random, [4, 6]);
      const total = perPizza * give;
      return {
        id,
        template: "parts",
        text: `Chaque pizza est coupée en ${parts(perPizza)}. ${capital(client)} reçoit ${pizzas(give)}. Combien de parts cela fait-il ?`,
        answer: total,
        unit: "parts",
        hint: `Chaque pizza donne ${parts(perPizza)}. Compte ${perPizza} parts autant de fois qu'il y a de pizzas.`,
        steps: [`Il y a ${pizzas(give)}.`, `Chacune a ${parts(perPizza)}.`, `${give} × ${perPizza} = ${total}.`, `Cela fait ${parts(total)}.`],
      };
    },
  },
  {
    name: "deux-livraisons",
    applies: ({ tour, stock, give, next }) => tour === 2 && next !== null && stock - give - next > 0,
    build: (id, { stock, give, next, client }) => {
      const after = stock - give;
      const nextGive = next as number;
      return {
        id,
        template: "deux-livraisons",
        text: `Léo a ${pizzas(stock)}. Il en remet ${give} à ${client}, puis ${nextGive} à la maison suivante. Combien lui en restera-t-il après ces deux livraisons ?`,
        answer: after - nextGive,
        unit: "pizzas",
        hint: "Fais le calcul en deux étapes : d'abord ce qui reste après cette maison, puis après la suivante.",
        steps: [`Après ${client} : ${stock} − ${give} = ${after}.`, `Après la maison suivante : ${after} − ${nextGive} = ${after - nextGive}.`, `Il lui restera ${pizzas(after - nextGive)}.`],
      };
    },
  },
  {
    name: "parts-mangees",
    applies: ({ tour, give }) => tour === 2 && give >= 2,
    build: (id, { give, client }, random) => {
      const perPizza = pick(random, [4, 6]);
      const total = perPizza * give;
      const eaten = randomInt(random, 2, Math.min(total - 2, 12));
      return {
        id,
        template: "parts-mangees",
        text: `${capital(client)} reçoit ${pizzas(give)} coupées en ${parts(perPizza)} chacune. La famille mange ${parts(eaten)}. Combien de parts reste-t-il ?`,
        answer: total - eaten,
        unit: "parts",
        hint: "Deux étapes : trouve d'abord le nombre total de parts, puis enlève celles qui sont mangées.",
        steps: [`Nombre de parts : ${give} × ${perPizza} = ${total}.`, `Parts mangées : ${eaten}.`, `${total} − ${eaten} = ${total - eaten}.`, `Il reste ${parts(total - eaten)}.`],
      };
    },
  },
];

/** Modèles utilisables pour une livraison donnée. */
export function applicableTemplates(context: DeliveryContext) {
  return DELIVERY_TEMPLATES.filter((template) => template.applies(context)).map(({ name }) => name);
}

/**
 * Question de livraison : un modèle applicable, de préférence pas encore utilisé dans la partie, et jamais le même que
 * la question précédente quand un autre modèle convient. `reserved` : modèle à laisser à la maison suivante quand c'est
 * le seul qui lui convient (sinon elle répéterait celui-ci).
 */
export function deliveryQuestion(
  id: string,
  context: DeliveryContext,
  used: readonly string[],
  random: Random,
  reserved: string | null = null,
): LeoQuestion {
  const all = DELIVERY_TEMPLATES.filter((template) => template.applies(context));
  if (all.length === 0) throw new Error(`aucun modèle pour ${id}`);
  const spared = all.filter(({ name }) => name !== reserved);
  const applicable = spared.length > 0 ? spared : all;
  const previous = used[used.length - 1];
  const fresh = applicable.filter(({ name }) => !used.includes(name));
  const notPrevious = applicable.filter(({ name }) => name !== previous);
  const pool = fresh.length > 0 ? fresh : notPrevious.length > 0 ? notPrevious : applicable;
  return pick(random, pool).build(id, context, random);
}

export const DELIVERY_TEMPLATE_NAMES = DELIVERY_TEMPLATES.map(({ name }) => name);

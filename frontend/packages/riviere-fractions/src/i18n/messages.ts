// Textes du jeu, en français et en anglais. Ils voyagent avec le module : l'application hôte n'a rien à fournir à part
// la langue voulue. Les deux dictionnaires ont exactement les mêmes clés (vérifié par un test).

const fr = {
  "game.title": "La Rivière des Fractions",
  "player.label": "Jeu La Rivière des Fractions",
  "level.title": "Niveau 1 — Première traversée",
  "intro.text": "Sept embranchements t'attendent. À chacun, dirige le bateau vers la voie de la bonne réponse.",
  "intro.start": "Larguer les amarres",
  "challenge.counter": "Défi {current} sur {total}",
  "challenge.rework": "À retravailler",
  "question.label": "Question",
  "word.of": "de",
  "lanes.label": "Réponses des trois voies",
  "lane.0": "gauche",
  "lane.1": "du centre",
  "lane.2": "droite",
  "laneShort.0": "Gauche",
  "laneShort.1": "Centre",
  "laneShort.2": "Droite",
  "steer.group": "Direction du bateau",
  "steer.left": "Vers la gauche",
  "steer.right": "Vers la droite",
  "correct.title": "Bonne voie !",
  "correct.text": "{answer} est juste.",
  "wrong.title": "Ce n'était pas la bonne voie",
  "wrong.answer": "La bonne réponse était {answer}, sur la voie {lane}.",
  "wrong.rework": "Cette question reviendra dans la prochaine traversée.",
  "wrong.restart": "Recommencer la traversée",
  "completed.title": "Niveau réussi !",
  "completed.textOne": "Sept bonnes voies sur sept, du premier coup. Bravo, capitaine !",
  "completed.textMany": "Sept bonnes voies sur sept. Tu as traversé la rivière en {attempts} essais.",
  "completed.replay": "Rejouer",
  "stats.challenge": "Défi",
  "stats.attempt": "Essai",
  "restart.label": "Recommencer la traversée depuis le premier défi",
  "sound.on": "Son activé",
  "sound.off": "Son coupé",
  "error.webgl": "Cet appareil ne peut pas afficher la rivière en 3D : WebGL n'est pas disponible dans ce navigateur.",
  "error.retry": "Réessayer",
  "perf.fps": "images/s",
  "howTo.read.title": "Lis la question",
  "howTo.read.text": "Elle s'affiche en haut, bien avant l'embranchement. Le bateau ralentit pour te laisser réfléchir.",
  "howTo.steer.title": "Dirige le bateau",
  "howTo.steer.text": "Avec ◀ ▶ ou les flèches du clavier, entre dans la voie dont le panneau porte la bonne réponse.",
  "howTo.rules.title": "Sept bonnes voies d'affilée",
  "howTo.rules.text": "Une erreur fait recommencer la traversée. Les questions ratées reviennent jusqu'à ce que tu les réussisses.",
  "hint.division-small": "Cherche le nombre qui, multiplié par le diviseur, redonne le grand nombre.",
  "hint.division": "Pense à la table du diviseur : combien de fois entre-t-il dans le grand nombre ?",
  "hint.fraction-as-division": "Une fraction, c'est une division : le nombre du haut divisé par celui du bas.",
  "hint.simplify": "Divise le haut et le bas par le même nombre, le plus grand possible.",
  "hint.equivalent-missing": "Regarde par combien le bas est multiplié, puis fais pareil en haut.",
  "hint.addition-same-denominator": "Quand le bas est le même, on additionne seulement les nombres du haut.",
  "hint.fraction-of-quantity": "Partage la quantité en parts égales : autant de parts que le nombre du bas.",
  "explain.division": "{dividend} ÷ {divisor} = {answer}, car {divisor} × {answer} = {dividend}.",
  "explain.fractionAsDivision": "{numerator}/{denominator} veut dire {numerator} ÷ {denominator}, donc {answer}, car {denominator} × {answer} = {numerator}.",
  "explain.simplify": "On divise le haut et le bas par {factor} : {numerator}/{denominator} = {answer}.",
  "explain.equivalent": "Le bas passe de {denominator} à {target} : il est multiplié par {factor}. Le haut aussi : {numerator} × {factor} = {answer}.",
  "explain.sum": "Le bas est le même : on additionne les nombres du haut, {first} + {second} = {total}, et on garde {denominator}. Résultat : {answer}.",
  "explain.fractionOf": "1/{denominator} de {quantity}, c'est {quantity} partagé en {denominator} parts égales : {quantity} ÷ {denominator} = {answer}.",
  "mistake.copiedDivisor": "Tu as choisi {chosen} : c'est le nombre par lequel on divise, pas le résultat.",
  "mistake.subtracted": "Tu as choisi {chosen} : c'est le résultat d'une soustraction, pas d'une division.",
  "mistake.halved": "Tu as choisi {chosen} : c'est diviser par 2, pas par le nombre du bas.",
  "mistake.numeratorOnly": "Tu as choisi {chosen} : c'est seulement le nombre du haut.",
  "mistake.inverted": "Tu as choisi {chosen} : c'est la fraction renversée.",
  "mistake.neighbour": "Tu as choisi {chosen} : c'est proche, mais ce n'est pas exact.",
  "mistake.addedInsteadOfMultiplied": "Tu as choisi {chosen} : tu as ajouté au lieu de multiplier.",
  "mistake.numeratorUnchanged": "Tu as choisi {chosen} : le haut doit changer comme le bas.",
  "mistake.addedDenominators": "Tu as choisi {chosen} : on n'additionne pas les nombres du bas.",
  "mistake.keptOneNumerator": "Tu as choisi {chosen} : il faut additionner les deux nombres du haut.",
  "mistake.remainderInsteadOfPart": "Tu as choisi {chosen} : c'est ce qui reste, pas la part demandée.",
  "mistake.multipliedInsteadOfDivided": "Tu as choisi {chosen} : il fallait partager, pas multiplier.",
  "mistake.copiedDenominator": "Tu as choisi {chosen} : c'est le nombre de parts, pas la taille d'une part.",
} as const;

export type MessageKey = keyof typeof fr;

const en: Record<MessageKey, string> = {
  "game.title": "The Fraction River",
  "player.label": "The Fraction River game",
  "level.title": "Level 1 — First crossing",
  "intro.text": "Seven forks lie ahead. At each one, steer the boat into the channel of the right answer.",
  "intro.start": "Cast off",
  "challenge.counter": "Challenge {current} of {total}",
  "challenge.rework": "Practise again",
  "question.label": "Question",
  "word.of": "of",
  "lanes.label": "Answers of the three channels",
  "lane.0": "left",
  "lane.1": "centre",
  "lane.2": "right",
  "laneShort.0": "Left",
  "laneShort.1": "Centre",
  "laneShort.2": "Right",
  "steer.group": "Boat steering",
  "steer.left": "Steer left",
  "steer.right": "Steer right",
  "correct.title": "Right channel!",
  "correct.text": "{answer} is right.",
  "wrong.title": "That was not the right channel",
  "wrong.answer": "The right answer was {answer}, in the {lane} channel.",
  "wrong.rework": "This question will come back in the next crossing.",
  "wrong.restart": "Start the crossing again",
  "completed.title": "Level complete!",
  "completed.textOne": "Seven right channels out of seven, at the first try. Well done, captain!",
  "completed.textMany": "Seven right channels out of seven. You crossed the river in {attempts} attempts.",
  "completed.replay": "Play again",
  "stats.challenge": "Challenge",
  "stats.attempt": "Attempt",
  "restart.label": "Start the crossing again from the first challenge",
  "sound.on": "Sound on",
  "sound.off": "Sound off",
  "error.webgl": "This device cannot show the river in 3D: WebGL is not available in this browser.",
  "error.retry": "Try again",
  "perf.fps": "frames/s",
  "howTo.read.title": "Read the question",
  "howTo.read.text": "It appears at the top, well before the fork. The boat slows down to give you time to think.",
  "howTo.steer.title": "Steer the boat",
  "howTo.steer.text": "With ◀ ▶ or the arrow keys, enter the channel whose sign shows the right answer.",
  "howTo.rules.title": "Seven right channels in a row",
  "howTo.rules.text": "A mistake starts the crossing again. Missed questions come back until you get them right.",
  "hint.division-small": "Look for the number that, multiplied by the divisor, gives back the big number.",
  "hint.division": "Think of the divisor's times table: how many times does it fit into the big number?",
  "hint.fraction-as-division": "A fraction is a division: the top number divided by the bottom one.",
  "hint.simplify": "Divide the top and the bottom by the same number, the biggest you can.",
  "hint.equivalent-missing": "See what the bottom is multiplied by, then do the same to the top.",
  "hint.addition-same-denominator": "When the bottom is the same, you only add the top numbers.",
  "hint.fraction-of-quantity": "Share the quantity into equal parts: as many parts as the bottom number.",
  "explain.division": "{dividend} ÷ {divisor} = {answer}, because {divisor} × {answer} = {dividend}.",
  "explain.fractionAsDivision": "{numerator}/{denominator} means {numerator} ÷ {denominator}, so {answer}, because {denominator} × {answer} = {numerator}.",
  "explain.simplify": "Divide the top and the bottom by {factor}: {numerator}/{denominator} = {answer}.",
  "explain.equivalent": "The bottom goes from {denominator} to {target}: it is multiplied by {factor}. So is the top: {numerator} × {factor} = {answer}.",
  "explain.sum": "The bottom is the same: add the top numbers, {first} + {second} = {total}, and keep {denominator}. Result: {answer}.",
  "explain.fractionOf": "1/{denominator} of {quantity} means {quantity} shared into {denominator} equal parts: {quantity} ÷ {denominator} = {answer}.",
  "mistake.copiedDivisor": "You chose {chosen}: that is the number you divide by, not the result.",
  "mistake.subtracted": "You chose {chosen}: that comes from a subtraction, not a division.",
  "mistake.halved": "You chose {chosen}: that is dividing by 2, not by the bottom number.",
  "mistake.numeratorOnly": "You chose {chosen}: that is only the top number.",
  "mistake.inverted": "You chose {chosen}: that is the fraction turned upside down.",
  "mistake.neighbour": "You chose {chosen}: it is close, but not exact.",
  "mistake.addedInsteadOfMultiplied": "You chose {chosen}: you added instead of multiplying.",
  "mistake.numeratorUnchanged": "You chose {chosen}: the top must change like the bottom.",
  "mistake.addedDenominators": "You chose {chosen}: the bottom numbers are not added.",
  "mistake.keptOneNumerator": "You chose {chosen}: both top numbers must be added.",
  "mistake.remainderInsteadOfPart": "You chose {chosen}: that is what is left, not the part asked for.",
  "mistake.multipliedInsteadOfDivided": "You chose {chosen}: you had to share, not multiply.",
  "mistake.copiedDenominator": "You chose {chosen}: that is the number of parts, not the size of one part.",
};

export type RiverLocale = "fr" | "en";

export const RIVER_LOCALES: readonly RiverLocale[] = ["fr", "en"];

export const messages: Readonly<Record<RiverLocale, Readonly<Record<MessageKey, string>>>> = { fr, en };

export function isMessageKey(key: string): key is MessageKey {
  return key in fr;
}

export type Translate = (key: MessageKey, params?: Readonly<Record<string, string | number>>) => string;

/** Traducteur de la langue voulue ; une clé inconnue (texte du domaine) retombe sur la clé elle-même. */
export function createTranslator(locale: RiverLocale): Translate {
  const dictionary = messages[locale] ?? messages.fr;
  return (key, params) => {
    const template = dictionary[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
  };
}

/** La langue de l'hôte, ramenée à une langue connue du jeu (le français par défaut). */
export function toRiverLocale(language: string | undefined): RiverLocale {
  const base = (language ?? "").toLowerCase().split("-")[0];
  return base === "en" ? "en" : "fr";
}

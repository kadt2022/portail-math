// Écriture des nombres de 0 à 99 999 en toutes lettres, en français et en
// anglais. La 4e primaire va jusqu'aux dizaines de mille (§ « nombres
// jusqu'à 100 000 ») : on compose donc un groupe de milliers par-dessus la
// grammaire 0-999 commune (voir ../course-engine/number-words-base.ts),
// sans dupliquer ces règles de base.

import { EN_UNITS, FR_UNITS, enBelowThousand, enTensAndUnits, frBelowThousand } from "../course-engine/number-words-base";

export function numberToWordsFr(value: number): string {
  const n = Math.round(value);
  if (n < 0 || n > 99999) {
    throw new RangeError(`numberToWordsFr ne gère que 0 à 99 999 (reçu ${n})`);
  }
  if (n === 0) {
    return FR_UNITS[0];
  }

  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const parts: string[] = [];

  if (thousands > 0) {
    // « vingt » ne prend jamais de s lorsqu'il est suivi d'un autre nombre :
    // 80 000 s'écrit "quatre-vingt mille", pas "quatre-vingts mille". Comme
    // `thousands` est toujours < 100 (5 chiffres au maximum, jamais de
    // centaine dans ce groupe), seule la valeur exacte 80 déclenche ce "s"
    // dans `frBelowThousand` (voir le cas `tensDigit === 8` de
    // `frTensAndUnits`) : on le retire uniquement dans ce cas précis, plutôt
    // qu'avec une regex qui couperait aussi le "s" final de mots comme
    // "trois" (63, 83...).
    const thousandsWord = thousands === 80 ? "quatre-vingt" : frBelowThousand(thousands);
    parts.push(thousands === 1 ? "mille" : `${thousandsWord} mille`);
  }
  if (rest > 0) {
    parts.push(frBelowThousand(rest));
  }

  return parts.join(" ");
}

export function numberToWordsEn(value: number): string {
  const n = Math.round(value);
  if (n < 0 || n > 99999) {
    throw new RangeError(`numberToWordsEn only supports 0 to 99 999 (received ${n})`);
  }
  if (n === 0) {
    return EN_UNITS[0];
  }

  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const parts: string[] = [];

  if (thousands > 0) {
    parts.push(`${enBelowThousand(thousands)} thousand`);
  }
  if (rest > 0) {
    parts.push(thousands > 0 && rest < 100 ? `and ${enTensAndUnits(rest)}` : enBelowThousand(rest));
  }

  return parts.join(" ");
}

export function roundToNearest(value: number, unit: number): number {
  return Math.round(value / unit) * unit;
}

// Regroupe les milliers par un espace (convention du manuel : « 24 638»)
// en français, par une virgule en anglais (« 24,638 »). Volontairement
// indépendant d'Intl.NumberFormat : son séparateur de milliers dépend des
// données ICU disponibles (espace normale, insécable ou fine selon
// l'environnement), ce qui casserait des tests qui comparent du texte.
export function formatNumber(value: number, language: string): string {
  const separator = language.startsWith("en") ? "," : " ";
  const negative = value < 0;
  const digits = String(Math.abs(Math.trunc(value)));
  const groups: string[] = [];
  for (let end = digits.length; end > 0; end -= 3) {
    groups.unshift(digits.slice(Math.max(0, end - 3), end));
  }
  return (negative ? "-" : "") + groups.join(separator);
}

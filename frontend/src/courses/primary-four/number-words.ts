// Écriture des nombres de 0 à 99 999 en toutes lettres, en français (RDC :
// septante/nonante ne sont pas utilisés) et en anglais. La 4e primaire va
// jusqu'aux dizaines de mille (§ « nombres jusqu'à 100 000 ») : on compose
// donc un groupe de milliers par-dessus la même logique 0-999 déjà éprouvée
// en 3e primaire, sans dupliquer les règles de grammaire de base.

const FR_UNITS = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
  "dix-sept", "dix-huit", "dix-neuf",
];

const FR_TENS: Record<number, string> = {
  2: "vingt",
  3: "trente",
  4: "quarante",
  5: "cinquante",
  6: "soixante",
  8: "quatre-vingt",
};

function frTensAndUnits(n: number): string {
  if (n < 20) {
    return FR_UNITS[n];
  }
  if (n < 70 || (n >= 80 && n < 90)) {
    const tensDigit = Math.floor(n / 10);
    const unit = n % 10;
    const tensWord = FR_TENS[tensDigit];
    if (unit === 0) {
      return tensDigit === 8 ? `${tensWord}s` : tensWord;
    }
    if (unit === 1 && tensDigit !== 8) {
      return `${tensWord}-et-un`;
    }
    return `${tensWord}-${FR_UNITS[unit]}`;
  }
  // 70-79 et 90-99 : construits sur soixante/quatre-vingt + 10..19
  const base = n < 80 ? "soixante" : "quatre-vingt";
  const remainder = n - (n < 80 ? 60 : 80);
  if (remainder === 11 && n < 80) {
    return `${base}-et-onze`;
  }
  return `${base}-${FR_UNITS[remainder]}`;
}

function frBelowThousand(n: number): string {
  if (n === 0) {
    return FR_UNITS[0];
  }
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];

  if (hundreds > 0) {
    if (hundreds === 1) {
      parts.push("cent");
    } else if (rest === 0) {
      parts.push(`${FR_UNITS[hundreds]} cents`);
    } else {
      parts.push(`${FR_UNITS[hundreds]} cent`);
    }
  }

  if (rest > 0) {
    parts.push(frTensAndUnits(rest));
  }

  return parts.join(" ");
}

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

const EN_UNITS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];

const EN_TENS: Record<number, string> = {
  2: "twenty",
  3: "thirty",
  4: "forty",
  5: "fifty",
  6: "sixty",
  7: "seventy",
  8: "eighty",
  9: "ninety",
};

function enTensAndUnits(n: number): string {
  if (n < 20) {
    return EN_UNITS[n];
  }
  const tensDigit = Math.floor(n / 10);
  const unit = n % 10;
  return unit === 0 ? EN_TENS[tensDigit] : `${EN_TENS[tensDigit]}-${EN_UNITS[unit]}`;
}

function enBelowThousand(n: number): string {
  if (n === 0) {
    return EN_UNITS[0];
  }
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];

  if (hundreds > 0) {
    parts.push(`${EN_UNITS[hundreds]} hundred`);
  }

  if (rest > 0) {
    parts.push(hundreds > 0 ? `and ${enTensAndUnits(rest)}` : enTensAndUnits(rest));
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

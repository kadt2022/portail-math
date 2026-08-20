// Écriture des nombres de 0 à 999 en toutes lettres, en français (RDC :
// septante/nonante ne sont pas utilisés) et en anglais. Deux fonctions pures,
// indépendantes de i18next, pour que chaque exercice puisse composer ses
// propres phrases sans dupliquer ces règles de grammaire dans les données.

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

export function numberToWordsFr(value: number): string {
  const n = Math.round(value);
  if (n === 0) {
    return FR_UNITS[0];
  }
  if (n < 0 || n > 999) {
    throw new RangeError(`numberToWordsFr ne gère que 0 à 999 (reçu ${n})`);
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

export function numberToWordsEn(value: number): string {
  const n = Math.round(value);
  if (n === 0) {
    return EN_UNITS[0];
  }
  if (n < 0 || n > 999) {
    throw new RangeError(`numberToWordsEn only supports 0 to 999 (received ${n})`);
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

export function roundToNearestTen(value: number): number {
  return Math.round(value / 10) * 10;
}

// Fraction exacte : numérateur et dénominateur entiers, dénominateur positif, toujours réduite. Aucun nombre à virgule
// n'intervient : deux fractions de même valeur sont égales, quelle que soit leur écriture (2/4 et 1/2).

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    [x, y] = [y, x % y];
  }
  return x;
}

function assertSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${name} doit être un entier exact (reçu ${value}).`);
  }
}

export class Fraction {
  readonly numerator: number;
  readonly denominator: number;

  private constructor(numerator: number, denominator: number) {
    this.numerator = numerator;
    this.denominator = denominator;
  }

  /** Fraction réduite n/d. Le dénominateur ne peut pas être nul. */
  static of(numerator: number, denominator = 1): Fraction {
    assertSafeInteger(numerator, "Le numérateur");
    assertSafeInteger(denominator, "Le dénominateur");
    if (denominator === 0) {
      throw new RangeError("Le dénominateur d'une fraction ne peut pas être nul.");
    }
    const sign = denominator < 0 ? -1 : 1;
    const divisor = gcd(numerator, denominator) || 1;
    return new Fraction((sign * numerator) / divisor, (sign * denominator) / divisor);
  }

  static integer(value: number): Fraction {
    return Fraction.of(value, 1);
  }

  get isInteger(): boolean {
    return this.denominator === 1;
  }

  plus(other: Fraction): Fraction {
    return Fraction.of(this.numerator * other.denominator + other.numerator * this.denominator, this.denominator * other.denominator);
  }

  minus(other: Fraction): Fraction {
    return Fraction.of(this.numerator * other.denominator - other.numerator * this.denominator, this.denominator * other.denominator);
  }

  times(other: Fraction): Fraction {
    return Fraction.of(this.numerator * other.numerator, this.denominator * other.denominator);
  }

  dividedBy(other: Fraction): Fraction {
    if (other.numerator === 0) {
      throw new RangeError("Division par zéro.");
    }
    return Fraction.of(this.numerator * other.denominator, this.denominator * other.numerator);
  }

  equals(other: Fraction): boolean {
    return this.numerator === other.numerator && this.denominator === other.denominator;
  }

  /** Négatif si cette fraction est plus petite, nul si égale, positif si plus grande (produits en croix). */
  compare(other: Fraction): number {
    return this.numerator * other.denominator - other.numerator * this.denominator;
  }

  toString(): string {
    return this.isInteger ? String(this.numerator) : `${this.numerator}/${this.denominator}`;
  }
}

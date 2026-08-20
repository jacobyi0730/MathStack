import Decimal from 'decimal.js';
import Fraction from 'fraction.js';
import type { Rng } from './rng.js';

export type ExactValue = Fraction | Decimal | number | string;

export interface FractionPairOptions {
  minDen: number;
  maxDen: number;
  improper?: boolean;
}

export interface FractionPair {
  a: number;
  b: number;
  d: number;
}

export interface UnlikeFractionPairOptions {
  minDen: number;
  maxDen: number;
}

export interface UnlikeFractionPair {
  a: number;
  b: number;
  d1: number;
  d2: number;
}

export interface DivisionFractionParams {
  a: number;
  b: number;
  c: number;
  d: number;
}

export function frac(numerator: number, denominator: number): Fraction {
  return new Fraction(numerator, denominator);
}

export function decimal(value: string | number): Decimal {
  return new Decimal(value);
}

export function renderValue(value: ExactValue): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (value instanceof Decimal) return value.toString();
  if (value instanceof Fraction) {
    return value.toFraction();
  }
  return String(value);
}

export function positiveDifference(left: number, right: number): number {
  return left >= right ? left - right : right - left;
}

export function gcd(left: number, right: number): number {
  let a = left >= 0 ? left : -left;
  let b = right >= 0 ? right : -right;
  while (b !== 0) {
    const rest = a % b;
    a = b;
    b = rest;
  }
  return a;
}

export function lcm(left: number, right: number): number {
  return (left / gcd(left, right)) * right;
}

export function noCarryAdd(left: number, right: number): number {
  let place = 1;
  let total = 0;
  let a = left;
  let b = right;

  while (a > 0 || b > 0) {
    const digit = ((a % 10) + (b % 10)) % 10;
    total += digit * place;
    place *= 10;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
  }

  return total;
}

export function misalignAdd(left: number, right: number): number {
  const tens = Math.floor(left / 10) + (right % 10);
  const ones = (left % 10) + Math.floor(right / 10);
  return tens * 10 + ones;
}

export function denominatorAdd(
  numeratorLeft: number,
  denominatorLeft: number,
  numeratorRight: number,
  denominatorRight: number,
): Fraction {
  return frac(numeratorLeft + numeratorRight, denominatorLeft + denominatorRight);
}

export function naiveCommonDenominatorAdd(
  numeratorLeft: number,
  numeratorRight: number,
  commonDenominator: number,
): Fraction {
  return frac(numeratorLeft + numeratorRight, commonDenominator);
}

export function multiplyStraightAcross(
  numeratorLeft: number,
  denominatorLeft: number,
  numeratorRight: number,
  denominatorRight: number,
): Fraction {
  return frac(numeratorLeft * numeratorRight, denominatorLeft * denominatorRight);
}

export function invertWholeResult(
  numeratorLeft: number,
  denominatorLeft: number,
  numeratorRight: number,
  denominatorRight: number,
): Fraction {
  return frac(denominatorLeft * numeratorRight, numeratorLeft * denominatorRight);
}

export function divideNumeratorsOnly(
  numeratorLeft: number,
  denominatorLeft: number,
  numeratorRight: number,
): Fraction {
  return frac(numeratorLeft, denominatorLeft * numeratorRight);
}

export function genFractionPair(rng: Rng, options: FractionPairOptions): FractionPair {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const d = rng.int(options.minDen, options.maxDen);
    const maxNumerator = options.improper ? d * 2 - 1 : d - 1;
    const a = rng.int(1, maxNumerator);
    const b = rng.int(1, maxNumerator);

    if (a !== b && a + b > 0) {
      return { a, b, d };
    }
  }

  throw new Error('genFractionPair 생성 실패');
}

export function genUnlikeFractionPair(rng: Rng, options: UnlikeFractionPairOptions): UnlikeFractionPair {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const d1 = rng.int(options.minDen, options.maxDen);
    const d2 = rng.int(options.minDen, options.maxDen);
    if (d1 === d2) continue;

    const common = lcm(d1, d2);
    if (common > 24) continue;

    const a = rng.int(1, d1 - 1);
    const b = rng.int(1, d2 - 1);
    if (a * (common / d1) + b * (common / d2) >= common * 2) continue;

    return { a, b, d1, d2 };
  }

  throw new Error('genUnlikeFractionPair 생성 실패');
}

export function genDivisionFractions(rng: Rng): DivisionFractionParams {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const b = rng.int(2, 9);
    const d = rng.int(2, 9);
    const a = rng.int(1, b - 1);
    const c = rng.int(1, d - 1);

    if (a * d !== b * c) {
      return { a, b, c, d };
    }
  }

  throw new Error('genDivisionFractions 생성 실패');
}

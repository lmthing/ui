// Exact arithmetic over stored decimal numbers, including proportional cost on partial sales.
// Convert to numbers only at the projection boundary, never when validating balances.
export type Decimal = readonly [numerator: bigint, denominator: bigint];
export const zero: Decimal = [0n, 1n];

function gcd(a: bigint, b: bigint): bigint {
  while (b) [a, b] = [b, a % b];
  return a < 0n ? -a : a;
}
function simplify(n: bigint, d: bigint): Decimal {
  if (!n) return zero;
  const divisor = gcd(n, d);
  return [n / divisor, d / divisor];
}
export function decimal(value: number): Decimal {
  const [mantissa, exponent = "0"] = String(value).split("e");
  const [whole, fraction = ""] = mantissa!.split(".");
  const digits = BigInt(whole! + fraction);
  const shift = Number(exponent) - fraction.length;
  return shift < 0 ? simplify(digits, 10n ** BigInt(-shift)) : [digits * 10n ** BigInt(shift), 1n];
}
export const add = ([a, b]: Decimal, [c, d]: Decimal) => simplify(a * d + c * b, b * d);
export const sub = ([a, b]: Decimal, [c, d]: Decimal) => simplify(a * d - c * b, b * d);
export const mul = ([a, b]: Decimal, [c, d]: Decimal) => simplify(a * c, b * d);
export const div = ([a, b]: Decimal, [c, d]: Decimal) => simplify(a * d, b * c);
export const negative = ([n]: Decimal) => n < 0n;
export const positive = ([n]: Decimal) => n > 0n;

export function numeric([n, d]: Decimal): number {
  if (n === 0n) return 0;
  const digits = (n < 0n ? -n : n).toString();
  const shift = d.toString().length - digits.length + 18;
  const significant = shift >= 0 ? (n * 10n ** BigInt(shift)) / d : n / (d * 10n ** BigInt(-shift));
  return Number(`${significant}e${-shift}`);
}

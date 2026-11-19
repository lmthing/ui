/** Each call supplies an unsigned, uniformly distributed 32-bit integer. */
export type RandomSource = () => number;
const range = 2 ** 32;
export const deviceRandom: RandomSource = () => globalThis.crypto.getRandomValues(new Uint32Array(1))[0]!;

export function randomIndex(size: number, random: RandomSource): number {
  if (!Number.isInteger(size) || size < 1 || size > range) throw new RangeError("Invalid draw size");
  if (size === 1) return 0;
  const limit = range - (range % size);
  for (;;) {
    const sample = random();
    if (!Number.isInteger(sample) || sample < 0 || sample >= range)
      throw new RangeError("Invalid random word");
    if (sample < limit) return sample % size;
  }
}

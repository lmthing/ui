import { randomIndex, type RandomSource } from "./random";

export type DeckDraw = {
  kind: "deck";
  drawn: readonly number[];
  discard: readonly number[];
  remaining: number;
};

export function initialDeck(size: number): DeckDraw {
  return { kind: "deck", drawn: [], discard: [], remaining: size };
}

/** Discards include the displayed batch; drawn is just the latest slice of that pile. */
export function drawBatch(state: DeckDraw, size: number, count: number, random: RandomSource): DeckDraw {
  if (!Number.isInteger(count) || count < 1 || count > 3) throw new RangeError("Invalid batch size");
  const eligible = Array.from({ length: size }, (_, index) => index).filter(
    (index) => !state.discard.includes(index),
  );
  const drawn = Array.from({ length: Math.min(count, eligible.length) }, () => {
    const index = randomIndex(eligible.length, random);
    return eligible.splice(index, 1)[0]!;
  });
  return { kind: "deck", drawn, discard: [...state.discard, ...drawn], remaining: eligible.length };
}

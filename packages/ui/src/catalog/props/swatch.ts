import { z } from "zod";
import { swatchNames, type Swatch } from "../tokens";

function distance(left: string, right: string): number {
  let row = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 0; i < left.length; i++) {
    const next = [i + 1];
    for (let j = 0; j < right.length; j++) {
      next.push(Math.min(next[j]! + 1, row[j + 1]! + 1, row[j]! + Number(left[i] !== right[j])));
    }
    row = next;
  }
  return row[right.length]!;
}

function nearest(value: unknown): Swatch {
  if (typeof value !== "string" || !value.trim()) return "grey";
  const name = value.trim().toLowerCase();
  return swatchNames.reduce((best, candidate) =>
    distance(name, candidate) < distance(name, best) ? candidate : best,
  );
}

/** Unknown names snap by edit distance; ties follow vocabulary order. */
export const swatch = z
  .enum(swatchNames)
  .catch((ctx) => nearest(ctx.input))
  .meta({ kind: "swatch", values: swatchNames });

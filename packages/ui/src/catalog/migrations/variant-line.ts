import type { Axis, AxisValue } from "../types";

type Line = Record<string, unknown>;
type VariantPatch = { [A in Axis]?: AxisValue<A> };

export type VariantMove = {
  from: "style" | "tone";
  values: Readonly<Partial<Record<string, VariantPatch>>>;
};

/** Staged until the corresponding component adopts its axes. */
export const variantMoves: Readonly<Partial<Record<string, readonly VariantMove[]>>> = {
  List: [
    {
      from: "style",
      values: {
        plain: { surface: "plain" },
        inset: { surface: "card" },
        cards: { surface: "card" },
        ranked: { lead: "number", trail: "value" },
      },
    },
  ],
  Card: [
    {
      from: "style",
      values: {
        plain: { surface: "plain" },
        tinted: { surface: "tinted" },
        outlined: { surface: "outlined" },
        media: { media: "cover" },
      },
    },
  ],
};

/** Move recognised legacy values only; an explicitly authored destination wins. */
export function migrateVariantProps(props: Line, moves: readonly VariantMove[]): Line {
  return moves.reduce((current, { from, values }) => {
    const value = current[from];
    if (typeof value !== "string" || !Object.hasOwn(values, value)) return current;
    const { [from]: _legacy, ...rest } = current;
    return { ...values[value], ...rest };
  }, props);
}

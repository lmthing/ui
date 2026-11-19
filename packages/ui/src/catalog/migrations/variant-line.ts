import type { Axis, AxisValue } from "../types";

type Line = Record<string, unknown>;
type VariantPatch = { [A in Axis]?: AxisValue<A> };

export type VariantMove = {
  from: "style" | "tone";
  values: Readonly<Partial<Record<string, VariantPatch>>>;
  retainStyle?: true;
  prepare?: (props: Line) => Line;
};

// Legacy ranked rows ignored their own trail: they displayed a score or no trailing accessory.
function preserveRankedTrail(props: Line): Line {
  if (Object.hasOwn(props, "trail") || !Array.isArray(props.rows)) return props;
  return {
    ...props,
    rows: props.rows.map((row: unknown) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return row;
      const { trail: _trail, ...item } = row as Line;
      return item.value ? item : { ...item, trail: "none" };
    }),
  };
}

/** Staged until the corresponding component adopts its axes. */
export const variantMoves: Readonly<Partial<Record<string, readonly VariantMove[]>>> = {
  List: [
    {
      from: "style",
      values: {
        plain: { surface: "plain" },
        inset: { surface: "card" },
      },
    },
    // The shared surface sets the finish; the structural style keeps one card per row.
    { from: "style", values: { cards: { surface: "card" } }, retainStyle: true },
    { from: "style", values: { ranked: { lead: "number", trail: "value" } }, prepare: preserveRankedTrail },
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
  return moves.reduce((current, { from, values, retainStyle, prepare }) => {
    const value = current[from];
    if (typeof value !== "string" || !Object.hasOwn(values, value)) return current;
    const patch = values[value]!;
    if (retainStyle && Object.keys(patch).every((key) => Object.hasOwn(current, key))) return current;
    const { [from]: legacy, ...rest } = prepare?.(current) ?? current;
    return { ...patch, ...(retainStyle ? { [from]: legacy } : {}), ...rest };
  }, props);
}

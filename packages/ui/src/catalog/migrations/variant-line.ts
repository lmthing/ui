import type { Axis, AxisValue } from "../types";

type Line = Record<string, unknown>;
type VariantPatch = { [A in Axis]?: AxisValue<A> };

export type VariantMove = {
  from: "style" | "tone";
  values: Readonly<Partial<Record<string, VariantPatch>>>;
  retainStyle?: true;
  prepare?: (props: Line) => Line;
};

const listVariants = ["density", "surface", "detail", "group", "overflow", "lead", "trail"];
const legacyListStyles = ["plain", "inset", "cards", "shelf", "ranked", "expand"];

/** Replay the old schema's effective layout before moving its style to shared axes. */
export function effectiveLegacyList(props: Line): Line {
  const style = props.style;
  if (!Array.isArray(props.rows)) return props;
  const alreadyAdopted = listVariants.some((axis) => Object.hasOwn(props, axis));
  const legacy = style === undefined || (typeof style === "string" && legacyListStyles.includes(style));
  if (!legacy || (alreadyAdopted && style !== "ranked" && style !== "inset" && style !== "plain"))
    return props;
  const rows = props.rows.filter((row): row is Line => !!row && typeof row === "object");
  if (!alreadyAdopted && rows.some((row) => row.photo && row.icon))
    props = {
      ...props,
      rows: (props.rows as unknown[]).map((row) => {
        if (!row || typeof row !== "object" || !("photo" in row) || !row.photo) return row;
        const { icon: _icon, ...rest } = row as Line;
        return rest;
      }),
    };
  const hasBody = rows.some((row) => row.body);
  // Mixed rows inferred expansion after validation; explicit expand would fail its all-bodies check.
  if (hasBody && rows.some((row) => !row.body) && style !== "expand") {
    if (style === undefined) return props;
    const { style: _style, ...rest } = props;
    return rest;
  }
  const effective = hasBody ? "expand" : rows.some((row) => row.me) ? "ranked" : style;
  return effective === style ? props : { ...props, style: effective };
}

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

/** Each table applies once the corresponding component adopts its axes. */
export const variantMoves: Readonly<Partial<Record<string, readonly VariantMove[]>>> = {
  Hero: [{ from: "style", values: { statement: {}, photo: { media: "cover" } } }],
  Loan: [{ from: "style", values: { summary: { detail: "brief" }, schedule: { detail: "full" } } }],
  Payoff: [{ from: "style", values: { plan: { detail: "full" }, compact: { detail: "brief" } } }],
  Slots: [{ from: "style", values: { grid: { arrange: "grid" }, list: { arrange: "rows" } } }],
  ServiceMenu: [
    { from: "style", values: { rows: { surface: "card" } } },
    { from: "style", values: { cards: { surface: "card" } }, retainStyle: true },
  ],
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
        plain: { surface: "card" },
        tinted: { surface: "tinted" },
        outlined: { surface: "outlined" },
        media: { media: "cover" },
      },
      prepare: (props) =>
        props.style === "media" && props.icon && !props.photo ? { media: "thumb", ...props } : props,
    },
  ],
  // Named rows are the default; the overlapping stack stays a structural style.
  People: [{ from: "style", values: { rows: {} } }],
  Gallery: [{ from: "style", values: { grid: { arrange: "grid" }, strip: { arrange: "strip" } } }],
  Stats: [{ from: "style", values: { tiles: { arrange: "grid" }, inline: { arrange: "rows" } } }],
  KeyValue: [{ from: "style", values: { rows: { arrange: "rows" }, grid: { arrange: "grid" } } }],
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

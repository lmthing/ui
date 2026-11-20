import type { Axis, AxisValue } from "../types";

type Line = Record<string, unknown>;
type VariantPatch = { [A in Axis]?: AxisValue<A> };

export type VariantMove = {
  from: "style" | "tone" | "kind";
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

/** Old sheets used a boolean per row; an explicit row tone takes precedence. */
export function migrateSheetItems(props: Line): Line {
  if (!Array.isArray(props.items)) return props;
  let changed = false;
  const items = props.items.map((row: unknown) => {
    if (!row || typeof row !== "object" || !("danger" in row) || typeof row.danger !== "boolean") return row;
    const { danger, ...rest } = row;
    changed = true;
    return { tone: danger ? "bad" : "neutral", ...rest };
  });
  return changed ? { ...props, items } : props;
}

/** Old progress bars called their over-target tone `over`. Keep explicit row axes intact. */
export function migrateProgressItems(props: Line): Line {
  if (!Array.isArray(props.bars)) return props;
  let changed = false;
  const bars = props.bars.map((row: unknown) => {
    if (!row || typeof row !== "object" || !("over" in row)) return row;
    const { over, ...rest } = row;
    if (over !== "warn" && over !== "good" && over !== "bad") return row;
    changed = true;
    return { tone: over, ...rest };
  });
  return changed ? { ...props, bars } : props;
}

/** Each table applies once the corresponding component adopts its axes. */
export const variantMoves: Readonly<Partial<Record<string, readonly VariantMove[]>>> = {
  Button: [
    {
      from: "kind",
      values: {
        primary: {},
        secondary: { surface: "tinted" },
        quiet: { surface: "plain" },
      },
    },
  ],
  Choice: [{ from: "style", values: { cards: { surface: "card" }, list: { surface: "plain" } } }],
  Amount: [
    { from: "style", values: { large: { emphasis: "hero" } } },
    { from: "style", values: { total: { surface: "outlined" } }, retainStyle: true },
  ],
  Ring: [{ from: "style", values: { md: {}, lg: { emphasis: "hero" } } }],
  Player: [{ from: "style", values: { compact: { density: "compact", detail: "brief" } } }],
  Progress: [
    { from: "style", values: { stack: { density: "comfortable" }, compact: { density: "compact" } } },
  ],
  Hero: [{ from: "style", values: { statement: {}, photo: { media: "cover" } } }],
  Header: [{ from: "style", values: { large: {}, inline: { emphasis: "quiet" } } }],
  Note: [
    {
      from: "style",
      values: { body: {}, quote: { emphasis: "hero" }, hint: { emphasis: "quiet" } },
      prepare: (props) =>
        props.style === "body" ? props : { icon: props.style === "quote" ? "quote" : "lightbulb", ...props },
    },
  ],
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
  Devices: [{ from: "style", values: { tiles: { group: "sections" } } }],
  Photo: [
    {
      from: "style",
      values: { wide: { aspect: "wide" }, square: { aspect: "square" }, tall: { aspect: "tall" } },
    },
  ],
  Profile: [
    {
      from: "style",
      values: { row: { align: "start" }, centered: { align: "center" } },
      prepare: (props) =>
        props.style === "centered" && (props.align ?? "center") === "center" && !props.photo
          ? { media: "none", ...props }
          : props,
    },
  ],
  Sheet: [],
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

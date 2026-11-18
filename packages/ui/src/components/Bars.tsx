import { z } from "zod";
import {
  clip,
  itemsOf,
  percentLine,
  placeholderTitle,
  text,
  thingOf,
  titleOf,
  totalLine,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import {
  KitBars,
  KitCard,
  KitContent,
  KitEmpty,
  KitGrid,
  KitShare,
  KitSkeleton,
  KitText,
  useComponentState,
} from "../kit";

export const meta = {
  id: "Bars",
  signature: "bars_grow",
  group: "data",
  purpose: "Compare counts or amounts across days or categories, using the actual counted or measured unit.",
  pick: "Compare one amount across days or categories. Not a few separate summary numbers (Stats), a trend with its latest value (Sparkline) or progress toward targets (Progress).",
  writeHints: [
    "Columns compare one measured unit. Column point labels are at most four characters: abbreviate day/category names (Mon, Tue, Fern, Mons).",
    'Shares of a whole use style: "share", with labels up to sixteen characters. Long category names do not make a columns input valid.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Amounts grouped by day or category from records in the on-device database.",
  items: { key: "points", parts: ["root", "label"] },
  parts: ["root", "title", "total"],
  states: ["filled", "empty", "loading"],
  aliases: ["columns", "histogram", "barchart", "breakdown", "share"],
  read: (input, state) => {
    if (state !== "filled") return [];
    const { points, unit, style } = input as z.output<typeof props>;
    const total = points.reduce((sum, point) => sum + point.value, 0);
    return [
      totalLine(total, unit),
      points
        .map(
          (point) =>
            `${point.label} ${point.value}${style === "share" ? ` ${percentLine(point.value, total)}` : ""}`,
        )
        .join(", "),
    ];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    style: z.enum(["columns", "share"]).default("columns"),
    title: text(32),
    unit: text(8).optional(),
    points: z
      .array(z.strictObject({ label: text(16), value: z.number().min(0) }))
      .min(2)
      .max(7),
  })
  .refine(({ style, points }) => style === "share" || points.every((point) => point.label.length <= 4), {
    path: ["points"],
    message: "Columns take labels of four characters or fewer",
  })
  .refine(({ style, points }) => style === "columns" || points.length <= 6, {
    path: ["points"],
    message: "A share holds at most six parts",
  });

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const points = itemsOf(cast, 7).flatMap((item) => {
    const label = titleOf(item, 4, thing);
    const fields =
      thing?.fields ?? Object.keys(item).filter((key) => !["id", "type", "sample"].includes(key));
    const value = fields
      .map((field) => item[field])
      .find((raw) => typeof raw === "number" && Number.isFinite(raw) && raw >= 0);
    return label ? [{ label, value: typeof value === "number" ? value : 0 }] : [];
  });
  const count = points.length ? Math.max(points.length, 2) : 7;
  while (points.length < count) points.push({ label: clip(placeholderTitle(points.length), 4), value: 0 });
  return {
    title: clip(thing?.type.replace(/[_-]+/g, " ").trim() || placeholderTitle(0), 32),
    points,
  };
}

export const examples = [
  {
    title: "Water used",
    unit: "L",
    points: [
      { label: "W1", value: 2 },
      { label: "W2", value: 4 },
      { label: "W3", value: 3 },
      { label: "W4", value: 5 },
    ],
  },
  {
    title: "This week",
    unit: "walks",
    points: [
      { label: "Mon", value: 3 },
      { label: "Tue", value: 5 },
      { label: "Wed", value: 4 },
      { label: "Thu", value: 2 },
      { label: "Fri", value: 6 },
      { label: "Sat", value: 2 },
      { label: "Sun", value: 1 },
    ],
  },
  {
    style: "share",
    title: "Where it went",
    unit: "€",
    points: [
      { label: "Groceries", value: 240 },
      { label: "Rent", value: 800 },
      { label: "Fun", value: 120 },
    ],
  },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "Compare how many walks I did each day this week, Monday through Sunday",
    expect: "Bars",
  },
  {
    kind: "choose",
    need: "Show how many plants I have, how many I watered today and how many are due",
    expect: "Stats",
  },
  {
    kind: "write",
    brief: "Show this week's walk counts, measured in walks: Mon 3, Tue 5, Wed 4, Thu 2, Fri 6, Sat 2, Sun 1",
    expect: "Bars",
  },
  {
    kind: "write",
    brief:
      "Show how this month's spending splits across Groceries €240, Rent €800 and Fun €120, as shares of the whole",
    expect: "Bars",
  },
] satisfies Probe[];

function Total({ value, unit }: { value: number; unit?: string | undefined }) {
  const label = totalLine(value).slice(0, -String(value).length).trim();
  return (
    <KitContent>
      <KitText role="caption" tone="muted" align="end" part={null}>
        {label}
      </KitText>
      <KitText role="number" tone="muted" align="end" part="total">
        {value}
        {unit && (
          <KitText role="caption" tone="muted" part={null}>
            {` ${unit}`}
          </KitText>
        )}
      </KitText>
    </KitContent>
  );
}

export function Bars({ style, title, unit, points }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  if (state === "loading" || state === "empty") {
    return (
      <KitCard style="inset" part="root" padded>
        {state === "loading" ? (
          <KitSkeleton shape="bars" rows={points.length} lead="none" />
        ) : (
          <KitEmpty part="title" />
        )}
      </KitCard>
    );
  }
  return (
    <KitCard style="inset" part="root" padded>
      <KitGrid columns={2}>
        <KitText role="heading" part="title">
          {title}
        </KitText>
        <Total value={points.reduce((total, point) => total + point.value, 0)} unit={unit} />
      </KitGrid>
      {style === "share" ? <KitShare points={points} percentOf={percentLine} /> : <KitBars points={points} />}
    </KitCard>
  );
}

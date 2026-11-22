// prettier-ignore
import {
  useWords, KitBars, KitCard, KitContent, KitGrid, KitHeader, KitShare, KitSkeleton, KitState,
  KitText, useComponentState, useVariant,
} from "../kit";
import { z } from "zod";
// prettier-ignore
import {
  probesFor, clip, itemsOf, icon, localeOf, placeholderTitle, text, thingOf, titleOf, screenId,
  totalLine, numberLine, wordsFor, variantProps, type ThemeDensity, type FallbackInput, type Meta,
  type Probe, type Props,
} from "../catalog";
export const meta = {
  id: "Bars",
  status: "ready",
  signature: "bars_grow",
  group: "data",
  purpose: "Compare counts or amounts across days or categories, using the actual counted or measured unit.",
  pick: "Compare one amount across days or categories. Not a few separate summary numbers (Stats), a trend with its latest value (Sparkline) or progress toward targets (Progress).",
  writeHints: [
    'A plain comparison or share breakdown always leaves detail and density null, even if no total is mentioned. Only an explicit request to hide the combined total sets detail "brief"; keep all points and leave density null unless tighter spacing was also requested.',
    "Columns compare one measured unit. Column point labels are at most four characters: abbreviate day/category names (Mon, Tue, Fern, Mons).",
    'For "share", use labels up to sixteen characters; optionally give a point an icon or goto screen. In "columns", active is a zero-based index and status is a short subline.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Amounts grouped by day or category from records in the on-device database.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["total"] } },
  items: { key: "points", parts: ["root", "label"] },
  parts: ["root", "title", "total", "status"],
  actions: { items: { root: ["press"] }, when: { "root.press": { pressable: true } } },
  states: ["filled", "empty", "loading"],
  read: (input, state, lang?: string): string[] => {
    if (state !== "filled") return [];
    const { points, unit, style, detail, active, status } = input as z.output<typeof props>;
    const total = points.reduce((sum, point) => sum + point.value, 0);
    const subline = currentLine(active === undefined ? undefined : points[active]!.label, status, lang);
    return [
      ...(detail === "brief" ? [] : [totalLine(total, unit, lang)]),
      ...(subline ? [subline] : []),
      (style === "share" ? largestFirst(points) : points)
        .map(
          (point) =>
            `${point.label} ${numberLine(point.value, lang)}${style === "share" ? ` ${shareLine(point.value, total, lang)}` : ""}`,
        )
        .join(", "),
    ];
  },
} as const satisfies Meta;

// prettier-ignore
export const props = z.strictObject({
  ...variantProps(meta.variants),
  style: z.enum(["columns", "share"]).default("columns"),
  title: text(32), unit: text(8).optional(),
  points: z.array(z.strictObject({ label: text(16), value: z.number().min(0), icon: icon.optional(), goto: screenId.optional() })
    .transform((point) => ({ ...point, ...(point.goto && { pressable: true }) }))).min(2).max(7),
  active: z.int().min(0).max(6).optional(), status: text(40).optional(),
})
  .refine(({ style, points }) => style === "share" || points.every((point) => point.label.length <= 4),
    { path: ["points"], message: "Columns take labels of four characters or fewer" })
  .refine(({ style, points }) => style === "columns" || points.length <= 6,
    { path: ["points"], message: "A share holds at most six parts" })
  .refine(({ style, points, active, status }) => style === "share"
    ? active === undefined && status === undefined
    : (active === undefined || active < points.length) && points.every((point) => !point.icon && !point.goto),
    { message: "Columns use active/status; share points use icons and links" })
  .overwrite((value) => (value.detail === "brief" ? { ...value, unit: undefined } : value));

function largestFirst<T extends { value: number }>(points: readonly T[]) {
  return [...points].sort((a, b) => b.value - a.value);
}

function currentLine(label?: string, status?: string, lang?: string) {
  const { activeBar, historyDetailLine } = wordsFor(lang);
  return !label ? status : status ? historyDetailLine(activeBar(label), status) : activeBar(label);
}

function shareLine(value: number, total: number, lang?: string) {
  return new Intl.NumberFormat(localeOf(lang), { style: "percent", maximumFractionDigits: 1 }).format(
    total > 0 ? value / total : 0,
  );
}

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
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
  while (points.length < count)
    points.push({ label: clip(placeholderTitle(points.length, lang), 4), value: 0 });
  return {
    title: clip(thing?.type.replace(/[_-]+/g, " ").trim() || placeholderTitle(0, lang), 32),
    points,
  };
}

// prettier-ignore
const fullExamples = [
  {
    title: "Water used",
    unit: "L",
    points: [{ label: "W1", value: 2 }, { label: "W2", value: 4 }, { label: "W3", value: 3 }, { label: "W4", value: 5 }],
  },
  {
    title: "Weekly walks",
    unit: "walks",
    points: [
      { label: "Mon", value: 3 }, { label: "Tue", value: 5 }, { label: "Wed", value: 4 }, { label: "Thu", value: 2 },
      { label: "Fri", value: 6 }, { label: "Sat", value: 2 }, { label: "Sun", value: 1 },
    ],
  },
  {
    style: "share",
    title: "Where it went",
    unit: "€",
    points: [{ label: "Groceries", value: 240 }, { label: "Rent", value: 800 }, { label: "Fun", value: 120 }],
  },
] satisfies z.input<typeof props>[];

export const examples = [
  ...fullExamples,
  { ...fullExamples[1]!, detail: "brief" },
  { ...fullExamples[2]!, density: "compact" },
  { ...fullExamples[1]!, active: 1, status: "Busier than usual" },
  {
    style: "share",
    title: "Where we walked",
    points: [
      { label: "Park", value: 15, icon: "tree", goto: "park" },
      { label: "River", value: 25, icon: "waves" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Bars");
// prettier-ignore
export const probes = [
  choose("Compare how many walks I did each day this week, Monday through Sunday"),
  choose("Show how many plants I have, how many I watered today and how many are due", "Stats"),
  write("Show this week's walk counts, measured in walks: Mon 3, Tue 5, Wed 4, Thu 2, Fri 6, Sat 2, Sun 1"),
  write("Show how this month's spending splits across Groceries €240, Rent €800 and Fun €120 in one stacked bar of shares, not a series of columns."),
  { ...write("Compare Mon 3, Tue 5 and Wed 4 walks. Keep the point labels but hide the combined total."), variant: { axis: "detail", value: "brief" } },
  { ...write('Compare arrivals in columns labelled exactly "8a", "9a", and "10a", with values 3, 8, and 6. Highlight the 8a column as current.'), expectProps: { active: 0 } },
  { ...write("Compare arrivals at 8am: 3 and 9am: 8. Under the title, show the status Busier than usual."), expectProps: { status: "Busier than usual" } },
  { ...write('Use one stacked share bar. The first legend label must be exactly "Park", with a separate value of 15 minutes and a tree icon. The second label must be exactly "River", with a separate value of 25 minutes and a waves icon. Park opens the screen whose ID is park.'),
    expectProps: { style: "share", points: [{ label: "Park", value: 15, icon: "tree", goto: "park" }, { label: "River", value: 25, icon: "waves" }] } },
  read("Open Park", { address: "c1/r1", action: "press" }, 6),
] satisfies Probe[];
type TotalProps = { value: number; unit?: string | undefined; compact?: boolean; density: ThemeDensity };
// prettier-ignore
function Total({ value, unit, compact = false, density }: TotalProps) {
  const { lang, words } = useWords();
  const role = compact ? "body" : "caption";
  return (
    <KitContent density={density} rhythm="flush">
      <KitText {...{ role, density }} tone="muted" align="end" part={null}>{words.moneyLabels.total}</KitText>
      <KitText role="number" numberScale={compact ? "compact" : "display"} tone="muted" align="end" part="total" density={density}>
        {numberLine(value, lang)}
        {unit && <KitText {...{ role, density }} tone="muted" part={null}>{` ${unit}`}</KitText>}
      </KitText>
    </KitContent>
  );
}

// prettier-ignore
export function Bars(input: Props<typeof props, typeof meta>) {
  const { style, title, unit, points, detail, active, status } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const { lang } = useWords();
  const state = useComponentState();
  if (state === "loading" || state === "empty") {
    return <KitCard part="root" padded density={density}>
      {state === "loading" ? <KitSkeleton shape="bars" points={points} title={title} share={style === "share"} density={density} />
        : <KitState part="title" density={density} />}
    </KitCard>;
  }
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const shareOf = (value: number, total: number) => shareLine(value, total, lang);
  const subline = currentLine(active === undefined ? undefined : points[active]!.label, status, lang);
  const heading = subline ? <KitHeader title={{ text: title, part: "title" }} meta={{ text: subline, part: "status" }} density={density} />
    : <KitText role="heading" part="title" density={density}>{title}</KitText>;
  return (
    <KitCard part="root" padded density={density}>
      {detail === "brief" ? heading : <KitGrid density={density}>
        {heading}<Total value={total} unit={unit} compact={style === "share"} density={density} /></KitGrid>}
      {style === "share" ? <KitShare points={largestFirst(points).map((point) => ({ ...point, press: Boolean(point.goto) }))} percentOf={shareOf} />
        : <KitBars points={points} {...(active !== undefined ? { highlight: active } : {})} />}
    </KitCard>
  );
}

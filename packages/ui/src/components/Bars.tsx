import {
  useWords,
  KitBars,
  KitCard,
  KitContent,
  KitEmpty,
  KitGrid,
  KitShare,
  KitSkeleton,
  KitText,
  useComponentState,
  useVariant,
} from "../kit";
import { z } from "zod";
import {
  probesFor,
  clip,
  itemsOf,
  percentLine,
  placeholderTitle,
  text,
  thingOf,
  titleOf,
  totalLine,
  numberLine,
  variantProps,
  type ThemeDensity,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
export const meta = {
  id: "Bars",
  signature: "bars_grow",
  group: "data",
  purpose: "Compare counts or amounts across days or categories, using the actual counted or measured unit.",
  pick: "Compare one amount across days or categories. Not a few separate summary numbers (Stats), a trend with its latest value (Sparkline) or progress toward targets (Progress).",
  writeHints: [
    'Hiding only the combined total means detail "brief" and density null, never "comfortable" or "compact". Keep all points and their labels. Set density only when tighter spacing is requested.',
    "Columns compare one measured unit. Column point labels are at most four characters: abbreviate day/category names (Mon, Tue, Fern, Mons).",
    'Shares of a whole use style: "share", with labels up to sixteen characters. Long category names do not make a columns input valid.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Amounts grouped by day or category from records in the on-device database.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["total"] } },
  items: { key: "points", parts: ["root", "label"] },
  parts: ["root", "title", "total"],
  states: ["filled", "empty", "loading"],
  read: (input, state, lang?: string): string[] => {
    if (state !== "filled") return [];
    const { points, unit, style, detail } = input as z.output<typeof props>;
    const total = points.reduce((sum, point) => sum + point.value, 0);
    return [
      ...(detail === "brief" ? [] : [totalLine(total, unit, lang)]),
      points
        .map(
          (point) =>
            `${point.label} ${numberLine(point.value, lang)}${style === "share" ? ` ${percentLine(point.value, total, lang)}` : ""}`,
        )
        .join(", "),
    ];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
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
  })
  .overwrite((value) => (value.detail === "brief" ? { ...value, unit: undefined } : value));

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
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("Bars");
export const probes = [
  choose("Compare how many walks I did each day this week, Monday through Sunday"),
  choose("Show how many plants I have, how many I watered today and how many are due", "Stats"),
  write("Show this week's walk counts, measured in walks: Mon 3, Tue 5, Wed 4, Thu 2, Fri 6, Sat 2, Sun 1"),
  write(
    "Show how this month's spending splits across Groceries €240, Rent €800 and Fun €120, as shares of the whole",
  ),
  {
    ...write("Compare Mon 3, Tue 5 and Wed 4 walks. Keep the point labels but hide the combined total."),
    variant: { axis: "detail", value: "brief" },
  },
] satisfies Probe[];
type TotalProps = { value: number; unit?: string | undefined; compact?: boolean; density: ThemeDensity };
// prettier-ignore
function Total({ value, unit, compact = false, density }: TotalProps) {
  const { lang, words } = useWords();
  const role = compact ? "body" : "caption";
  return (
    <KitContent density={density}>
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
  const { style, title, unit, points, detail } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const { lang } = useWords();
  const state = useComponentState();
  if (state === "loading" || state === "empty") {
    return <KitCard part="root" padded density={density}>
      {state === "loading"
        ? <KitSkeleton shape="bars" points={points} title={title} share={style === "share"} density={density} />
        : <KitEmpty part="title" />}
    </KitCard>;
  }
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const shareOf = (value: number, total: number) => percentLine(value, total, lang);
  const heading = <KitText role="heading" part="title" density={density}>{title}</KitText>;
  return (
    <KitCard part="root" padded density={density}>
      {detail === "brief" ? heading : <KitGrid density={density}>
        {heading}<Total value={total} unit={unit} compact={style === "share"} density={density} /></KitGrid>}
      {style === "share" ? <KitShare points={points} percentOf={shareOf} /> : <KitBars points={points} />}
    </KitCard>
  );
}

import { z } from "zod";
import * as c from "../catalog";
import * as kit from "../kit";
import { prompt } from "../entry/prompt-RollupRows.generated";

export const meta = {
  id: "RollupRows",
  status: "ready",
  group: "data",
  tier: "phone",
  pick: prompt.pick,
  purpose: prompt.purpose,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  realPath: "Show period aggregates from underlying records; a linked row opens those records.",
  variants: { detail: ["full", "brief"] },
  parts: ["root", "period", "metric", "total", "total_value", "empty"],
  items: { key: "rows", parts: ["root", "label", "value", "detail"] },
  variantParts: { "detail.brief": { hides: ["detail"] } },
  actions: { items: { root: ["press"] }, when: { root: { linked: true } } },
  states: ["filled", "empty", "loading"],
  readInState: (_input, state) => state === "empty",
  read: (input, state, lang): string[] => {
    const { period, metric, unit, rows, total } = input as z.output<typeof props>;
    if (state === "empty") return [`${metric} · ${period}`, c.wordsFor(lang).rollupRows.empty];
    return [
      `${metric} · ${period}`,
      ...(total === undefined ? [] : [c.totalLine(total, unit, lang)]),
      ...rows.map(({ value }, index) => `r${index + 1}: ${amount(value, unit, lang)}`),
    ];
  },
} as const satisfies c.Meta;

const measure = z.number().min(-999999999).max(999999999);
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    period: c.text(28).meta({ read: false }),
    metric: c.text(28).meta({ read: false }),
    unit: c.text(12).meta({ read: false }),
    total: measure.optional(),
    rows: z
      .array(
        z.strictObject({
          label: c.text(40),
          value: measure,
          breakdown: c.text(80).optional(),
          goto: c.screenId.optional(),
        }),
      )
      .min(1)
      .max(6),
  })
  .overwrite((input) => ({
    ...input,
    rows: input.rows.map((row) => ({
      ...row,
      linked: Boolean(row.goto),
      breakdown: input.detail === "full" ? row.breakdown : undefined,
    })),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  const words = c.wordsFor(lang).rollupRows;
  return {
    period: words.period,
    metric: words.metric,
    unit: words.unit,
    rows: (items.length ? items : [undefined]).map((item, index) => ({
      label: (item && c.titleOf(item, 40, thing)) || c.placeholderTitle(index, lang),
      value: 0,
    })),
  };
}

const garden = {
  period: "November 2026",
  metric: "Water used",
  unit: "L",
  total: 58,
  rows: [
    {
      label: "Glasshouse",
      value: 36,
      breakdown: "24 L benches · 12 L hanging pots",
      goto: "glasshouse_water",
    },
    { label: "Propagation room", value: 22, breakdown: "18 L seed trays · 4 L cuttings" },
  ],
} satisfies z.input<typeof props>;
export const examples = [
  garden,
  {
    period: "Week of 23 November",
    metric: "Walking time",
    unit: "min",
    total: 195,
    rows: [
      { label: "Meadow team", value: 135, breakdown: "3 walks × 45 min" },
      { label: "Riverside team", value: 60, breakdown: "2 walks × 30 min" },
    ],
  },
  { ...garden, detail: "brief" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("RollupRows");
export const probes = [
  choose(
    "Compare our clinic branches for the same week. Show one completed-visit count per branch, a short breakdown underneath, and the total across branches on a narrow phone.",
  ),
  choose(
    "Show three headline numbers, patients waiting, clinicians on duty and available rooms, for the front desk.",
    "Stats",
  ),
  write(
    "Compare water used in November 2026: Glasshouse 36 L (24 L benches and 12 L hanging pots), Propagation room 22 L. Total 58 L. Open glasshouse_water from Glasshouse.",
  ),
  {
    ...write(
      "Compare water used in November 2026: Glasshouse 36 L and Propagation room 22 L. Keep the Glasshouse breakdown 24 L benches and 12 L hanging pots, but hide it on screen.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the water figures for the glasshouse", { address: "r1/r1", action: "press" }),
] satisfies c.Probe[];

type RollupProps = c.Props<typeof props, typeof meta>;
const amount = (value: number, unit: string, lang?: string) => `${c.numberLine(value, lang)} ${unit}`;

function RollupContent({ rows, unit, total }: RollupProps) {
  const { lang, words } = kit.useWords();
  const active = kit.useComponentState() === "filled";
  return (
    <>
      <kit.KitRowGroup>
        {rows.map((row) => (
          <kit.KitRow
            key={row.id}
            item={row.id}
            label={row.label}
            goto={active ? row.goto : undefined}
            inset="none"
            trailing={
              <RollupMeasure
                part="value"
                text={amount(row.value, unit, lang)}
                linked={active && Boolean(row.goto)}
              />
            }
          >
            <kit.KitLayoutText line={{ text: row.label, part: "label", strong: true }} />
            <kit.KitLayoutText line={{ text: row.breakdown, part: "detail", role: "meta", tone: "muted" }} />
          </kit.KitRow>
        ))}
      </kit.KitRowGroup>
      {total !== undefined && (
        <kit.KitRow
          part="total"
          label={words.rollupRows.total}
          inset="none"
          trailing={<RollupMeasure part="total_value" text={amount(total, unit, lang)} linked={false} />}
        >
          <kit.KitLayoutText line={{ text: words.rollupRows.total, strong: true }} />
        </kit.KitRow>
      )}
    </>
  );
}

function RollupMeasure({ part, text, linked }: { part: string; text: string; linked: boolean }) {
  return (
    <>
      <kit.KitLayoutText line={{ text, part, role: "meta", tabular: true, strong: true }} />
      <kit.KitIcon name="chevron_right" scale="sm" tone="muted" decorative hidden={!linked} />
    </>
  );
}

export function RollupRows(input: RollupProps) {
  const { rollupRows } = kit.useWords().words;
  const density = kit.useKit().density;
  const state = kit.useComponentState();
  const scope = (
    <kit.KitContent rhythm="flush">
      <kit.KitLayoutText line={{ text: input.metric, part: "metric", strong: true }} />
      <kit.KitLayoutText line={{ text: input.period, part: "period", role: "meta", tone: "muted" }} />
    </kit.KitContent>
  );
  const content = (
    <>
      {scope}
      <RollupContent {...input} />
    </>
  );
  return (
    <kit.KitCard part="root" style="inset" padded density={density}>
      {state === "empty" && scope}
      <kit.KitState part="empty" message={rollupRows.empty} loading={content}>
        {content}
      </kit.KitState>
    </kit.KitCard>
  );
}

import { z } from "zod";
import {
  clip,
  isoDate,
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import * as kit from "../../../kit";
import { payStubDisplay, payStubReading } from "../copy";
import { teamWordsFor } from "../lang";

// Core first: Amount/total shows one sum, not a dated pay statement with earnings, deductions, and year-to-date totals.
export const meta = {
  id: "PayStub",
  status: "ready",
  group: "data",
  tier: "people",
  pick: "An employee viewing their issued payslip with net pay, earnings and deductions. Not one total (Amount), running payroll (Payroll), collecting daily hours (Timesheet), or personal bills (Bills).",
  purpose: "See an issued pay statement and how earnings and deductions add up.",
  region: "body",
  weight: 2,
  realPath: "finalized read-only pay statements issued to the employee by a shared employer payroll host.",
  variants: { detail: ["full", "brief"], density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  variantParts: {
    "detail.brief": { hides: ["employee", "period", "earnings", "deductions", "ytd_gross", "ytd_net"] },
  },
  writeHints: [
    'Set detail to "brief" when asked to show only pay date, gross, total deductions and net. Keep required source fields and set density and surface to null unless requested.',
  ],
  parts: [
    "root",
    "title",
    "employee",
    "period",
    "paid",
    "net",
    "gross",
    "deducted",
    "earnings",
    "deductions",
    "ytd_gross",
    "ytd_net",
    "message",
    "export",
  ],
  actions: { parts: { export: ["press"] } },
  partTiers: { export: "service" },
  states: ["filled", "empty", "loading", "error"],
  read: (input, state, lang, _data, currency): string[] =>
    state === "filled" ? payStubReading(input as z.output<typeof props>, lang, currency) : [],
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    periodFrom: isoDate.meta({ read: false }),
    periodTo: isoDate.meta({ read: false }),
    payDate: isoDate.meta({ read: false }),
    employee: text(24).meta({ read: false }),
    earnings: z
      .array(
        z.strictObject({
          label: text(24),
          hours: z.number().min(0).optional(),
          rate: z.number().min(0).optional(),
          amount: z.number().min(0),
        }),
      )
      .min(1)
      .max(6)
      .meta({ read: false }),
    deductions: z
      .array(z.strictObject({ label: text(24), amount: z.number().min(0) }))
      .min(0)
      .max(6)
      .meta({ read: false }),
    ytdGross: z.number().min(0).optional().meta({ read: false }),
    ytdNet: z.number().min(0).optional().meta({ read: false }),
  })
  .refine(({ periodFrom, periodTo }) => periodFrom <= periodTo, {
    path: ["periodTo"],
    message: "Pay period end cannot come before the start",
  });

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 1);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    periodFrom: "2000-01-01",
    periodTo: "2000-01-01",
    payDate: "2000-01-01",
    employee: castTitle(24, 0),
    earnings: Array.from({ length: 1 }, (_, index) => ({ label: castTitle(24, index), amount: 0 })),
    deductions: [],
  };
}

// prettier-ignore
export const examples = [
  { employee: "Rae", periodFrom: "2026-11-01", periodTo: "2026-11-14", payDate: "2026-11-20",
    earnings: [{ label: "Regular hours", hours: 72, rate: 16, amount: 1152 }, { label: "Extra hours", hours: 4, rate: 24, amount: 96 }],
    deductions: [{ label: "Income tax", amount: 153.6 }, { label: "Pension", amount: 49.92 }],
    ytdGross: 24208, ytdNet: 20114.20 },
  { employee: "Sam", periodFrom: "2026-11-01", periodTo: "2026-11-07", payDate: "2026-11-13",
    earnings: [{ label: "Route cover", amount: 620 }], deductions: [] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("PayStub");
export const probes = [
  choose(
    "Show me my issued payslip with my pay date, itemized earnings and tax deductions, take-home pay and year-to-date totals.",
  ),
  choose(
    "Show one money total of 42 dollars spent on plants. No transaction rows or other figures.",
    "Amount",
  ),
  write(
    "Show Rae's full itemized payslip for November 1 to 14, 2026, paid November 20, 2026. Regular hours: 72 hours at 16, amount 1152; tax deduction 153.60. Display year-to-date gross 24208. Use the default presentation with variant fields null.",
  ),
  {
    ...write(
      "Show Sam's issued payslip for November 1 to 7, 2026, paid November 13, 2026. Route cover earnings 620, no deductions. Display only pay date, gross, total deductions and net pay; hide the itemized statement. Leave density and surface null.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Press Export pay statement to download a copy of my payslip.", {
    address: "p1/export",
    action: "press",
  }),
] satisfies Probe[];

type ViewProps = Props<typeof props, typeof meta>;
type Display = ReturnType<typeof payStubDisplay>;
type Entry = Display["earnings"][number];

// prettier-ignore
function PayLine({ row, density }: { row: Entry; density: ViewProps["density"] }) {
  return (
    <kit.KitRow label={row.label} inset="none" inline fitContent density={density}>
      <kit.KitContent rhythm="flush" density={density}>
        <kit.KitGrid fitLast density={density}>
          <kit.KitLayoutText line={{ text: row.label, role: "body" }} density={density} />
          <kit.KitLayoutText line={{ text: row.amount, part: row.part ?? null, role: "figure", compact: true, tabular: true }} align="end" density={density} />
        </kit.KitGrid>
        <kit.KitLayoutText line={{ text: row.note, role: "meta", tone: "muted" }} density={density} />
      </kit.KitContent>
    </kit.KitRow>
  );
}

// prettier-ignore
function PaySection({ title, part, rows, density }: {
  title: string; part?: string; rows: Entry[]; density: ViewProps["density"];
}) {
  return (
    <kit.KitContent density={density}>
      {part && <kit.KitHeader title={{ text: title, part, role: "body", strong: true }} density={density} />}
      <kit.KitRowGroup separators={false} spacing={part === "earnings" ? "groups" : "rows"} density={density}>
        {rows.map((row, index) => <PayLine key={index} {...{ row, density }} />)}
      </kit.KitRowGroup>
    </kit.KitContent>
  );
}

// prettier-ignore
function StatementBody({ data, brief, density }: { data: Display; brief: boolean; density: ViewProps["density"] }) {
  const { words: { payStub: words } } = kit.useWords(teamWordsFor);
  return (
    <>
      <kit.KitHeader title={{ text: words.title, part: "title", role: "body" }} meta={[
        { text: brief ? undefined : data.employee, part: "employee" },
        { text: brief ? undefined : data.period, part: "period" },
        { text: data.paid, part: "paid" },
      ]} density={density} />
      <kit.KitFigure value={{ text: data.net, part: "net" }} unit={{ text: words.net, role: "meta" }} density={density} />
      <PaySection title={words.title} rows={data.totals} density={density} />
      {!brief && <>
        <PaySection title={words.earnings} part="earnings" rows={data.earnings} density={density} />
        {data.deductions.length > 0 && <PaySection title={words.deductions} part="deductions" rows={data.deductions} density={density} />}
        {data.ytd.length > 0 && <PaySection title={words.title} rows={data.ytd} density={density} />}
      </>}
      <kit.KitActionFooter density={density}>
        <kit.KitAction part="export" label={words.export} contentParts={{}} kind="secondary" />
      </kit.KitActionFooter>
    </>
  );
}

// prettier-ignore
export function PayStub(input: ViewProps) {
  const state = kit.useComponentState();
  const { lang, words: { payStub: words } } = kit.useWords(teamWordsFor);
  const currency = kit.useAppCurrency();
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const data = payStubDisplay(input, lang, currency);
  const content = <StatementBody data={data} brief={detail === "brief"} density={density} />;
  return (
    <kit.KitCard part="root" style="inset" padded {...{ density, surface }}>
      <kit.KitState message={state === "error" ? words.error : words.empty} icon={state === "error" ? "alert" : "file_text"}
        part="message" {...{ density }} loading={content}>
        {content}
      </kit.KitState>
    </kit.KitCard>
  );
}

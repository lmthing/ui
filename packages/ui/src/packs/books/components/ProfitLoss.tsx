import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
// prettier-ignore
import { previewProfit, profitDates, profitDisplay, profitRead, profitRow, profitRows, type ProfitRow } from "../copy";
import { booksWordsFor } from "../lang";
import { periodFields, seedPeriod, validPeriod } from "../seeds";
import { prompt } from "../../../entry/prompt-ProfitLoss.generated";

// Core first: Stats/default shows independent figures, not a reconciled statement and taxable-profit bridge.
// prettier-ignore
export const meta = {
  id: "ProfitLoss",
  status: "ready",
  group: "data",
  ...prompt,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The host aggregates the full local ledger under the brief's accounting and deductibility rules.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["change"] } },
  parts: ["root", "from", "to", "comparison", "income", "costs", "profit", "profit_change",
    "disallowed_costs", "taxable_profit"],
  items: {
    key: "categories",
    parts: ["root", "label", "subtotal", "change"],
    deviceData: { schema: profitRow, rows: profitRows },
    visibleWhen: { active: true },
  },
  states: ["filled", "empty", "loading", "error"],
  actions: { items: { root: ["press"] }, when: { root: { linked: true } } },
  deviceData: ["books_profit_rules", "books_ledger_entries"],
  previewDeviceData: previewProfit,
  read: profitRead,
} as const satisfies c.Meta;

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants), ...periodFields,
  compareFrom: c.isoDate.optional(), compareTo: c.isoDate.optional(), ledgerGoto: c.screenId.optional(),
  style: z.enum(["statement", "tax_bridge"]).default("statement"),
})
  .refine(validPeriod, { path: ["to"], message: "Use an ordered period of at most 366 days" })
  .refine(
    ({ compareFrom, compareTo }) =>
      (compareFrom === undefined && compareTo === undefined) ||
      (compareFrom !== undefined && compareTo !== undefined && validPeriod({ from: compareFrom, to: compareTo })),
    { path: ["compareTo"], message: "Use both comparison dates in an ordered period of at most 366 days" },
  );

export function fallback(_input: c.FallbackInput): z.input<typeof props> {
  return { ...seedPeriod };
}

// prettier-ignore
export const examples = [
  { from: "2026-10-01", to: "2026-10-31", ledgerGoto: "care_ledger" },
  {
    from: "2026-11-01", to: "2026-11-30", compareFrom: "2026-10-01", compareTo: "2026-10-31",
    ledgerGoto: "walk_ledger", style: "tax_bridge", density: "compact",
  },
  { from: "2026-11-01", to: "2026-11-30", compareFrom: "2026-10-01", compareTo: "2026-10-31",
    ledgerGoto: "walk_ledger", style: "tax_bridge", detail: "brief" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("ProfitLoss");
export const probes = [
  choose(
    "Close my business's month: group income and expenses by category, reconcile to accounting profit, then add back disallowed costs to get taxable profit.",
  ),
  choose(
    "Show exactly three independent headline numbers side by side: total walks, active clients and new enquiries.",
    "Stats",
  ),
  write(
    "Reconcile October 2026 income, costs and profit from my plant-care business, with category drill-down to care_ledger. Don't compare another period.",
  ),
  {
    ...write(
      "Make a November 2026 profit and loss statement against October 2026. Keep both periods and all category totals, but show the period change for net profit only, not on individual categories.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the source lines for the first income category.", { address: "p1/r1", action: "press" }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Display = NonNullable<ReturnType<typeof profitDisplay>>;
type Row = ProfitRow & { id: string };
type Density = c.AxisValue<"density">;
type Words = ReturnType<typeof booksWordsFor>["profitLoss"];

// prettier-ignore
function AmountLine({ part, label, value, density }: { part: string; label: string; value: string; density: Density }) {
  return <kit.KitGrid fitLast {...{ density }}>
    <kit.KitText part={null} role="body" emphasis="strong">{label}</kit.KitText>
    <kit.KitText {...{ part }} role="number" numberScale="compact" tabular>{value}</kit.KitText>
  </kit.KitGrid>;
}

// prettier-ignore
function Section({ rows, label, totalPart, total, display, density }: {
  rows: Row[]; label: string; totalPart: string; total: string; display: Display; density: Density;
}) {
  return <kit.KitContent group="response" {...{ density }}>
    <AmountLine part={totalPart} value={total} {...{ label, density }} />
    <kit.KitGrid list arrange="rows" listRowGap={rows.some((row) => display.row(row).change) ? "cards" : undefined} {...{ density }}>
      {rows.map((row) => {
        const { subtotal, change } = display.row(row);
        return <kit.KitRow key={row.id} item={row.id} label={row.label!} goto={row.goto} inline {...{ density }}>
          <kit.KitContent {...{ density }}>
            <kit.KitGrid fitLast {...{ density }}>
              <kit.KitText part="label" role="body">{row.label}</kit.KitText>
              <kit.KitText part="subtotal" role="body" tabular>{subtotal}</kit.KitText>
            </kit.KitGrid>
            {change && <kit.KitText part="change" role="label" tone="muted">{change}</kit.KitText>}
          </kit.KitContent>
        </kit.KitRow>;
      })}
    </kit.KitGrid>
  </kit.KitContent>;
}

// prettier-ignore
function StatementLoading({ w, dates, display, density, bridge, categories }: {
  w: Words; dates: ReturnType<typeof profitDates>; display?: Display | undefined; density: Density; bridge: boolean;
  categories: Row[];
}) {
  const { lang } = kit.useWords();
  const money = display?.amounts.profit ?? c.moneyLine(0, c.defaultCurrency, undefined, lang);
  const bar = (role: kit.TextRole, text?: string) => <kit.KitSkeleton shape="figure" inset="none" {...{ density }}
    content={[[ role, text, role === "number" ? "end" : "start", "compact" ]]} />;
  const line = (label: string, amount: string, role: kit.TextRole) =>
    <kit.KitGrid key={label} fitLast {...{ density }}>{bar(role, label)}{bar("number", amount)}</kit.KitGrid>;
  return <>
    <kit.KitContent {...{ density }}>
      {bar("label", w.heading)}
      <kit.KitGrid fitLast {...{ density }}>{bar("label", dates.from)}{bar("label", dates.to)}</kit.KitGrid>
      {dates.comparison && bar("label", dates.comparison)}
    </kit.KitContent>
    <kit.KitContent group="response" {...{ density }}>
      <kit.KitSkeleton shape="figure" inset="none" {...{ density }}
        content={[[ "label", w.profit ], [ "number", money ], [ "label", display?.profitChange ]]} />
    </kit.KitContent>
    {(["income", "expense"] as const).map((kind) =>
      <kit.KitContent key={kind} group="response" {...{ density }}>
        {line(w[kind], money, "label")}
        {categories.filter((row) => row.active && row.kind === kind).map((row) =>
          <kit.KitRow key={row.id} part={null} label={row.label!} inline {...{ density }}>
            {line(row.label!, display?.row(row).subtotal ?? money, "body")}
          </kit.KitRow>)}
      </kit.KitContent>)}
    {bridge && <kit.KitContent group="response" {...{ density }}>{line(w.addBack, money, "label")}{line(w.taxable, money, "label")}</kit.KitContent>}
  </>;
}

// prettier-ignore
export function ProfitLoss(input: View) {
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { lang, words: { profitLoss: w } } = kit.useWords(booksWordsFor);
  const { categories = [] } = kit.useLiveControls(meta, input) as { categories?: Row[] };
  const state = kit.useComponentState(), dates = profitDates(input, lang);
  const display = profitDisplay({ ...input, detail }, kit.useDeviceData(), lang), a = display?.amounts;
  const bridge = input.style === "tax_bridge";
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    {state === "loading" ? <StatementLoading {...{ w, dates, display, density, bridge, categories }} /> :
      state === "error" || (state !== "empty" && !display) ?
        <kit.KitEmpty decorativeIcon icon="file_text" title={w.errorTitle} sub={w.errorDetail} /> :
      state === "empty" || display?.empty ? <kit.KitEmpty decorativeIcon /> : display && a && <>
        <kit.KitContent {...{ density }}>
          <kit.KitText part={null} role="label" tone="muted">{w.heading}</kit.KitText>
          <kit.KitGrid fitLast {...{ density }}>
            <kit.KitText part="from" role="label">{dates.from}</kit.KitText>
            <kit.KitText part="to" role="label">{dates.to}</kit.KitText>
          </kit.KitGrid>
          {dates.comparison && <kit.KitText part="comparison" role="label" tone="muted">{dates.comparison}</kit.KitText>}
        </kit.KitContent>
        <kit.KitContent group="response" {...{ density }}>
          <kit.KitText part={null} role="label" tone="muted">{display.profitLabel}</kit.KitText>
          <kit.KitText part="profit" role="number" tabular>{a.profit}</kit.KitText>
          {display.profitChange && <kit.KitText part="profit_change" role="label" tone="muted">{display.profitChange}</kit.KitText>}
        </kit.KitContent>
        <Section rows={categories.filter((row) => row.active && row.kind === "income")} label={w.income} totalPart="income" total={a.income} {...{ display, density }} />
        <Section rows={categories.filter((row) => row.active && row.kind === "expense")} label={w.expense} totalPart="costs" total={a.costs} {...{ display, density }} />
        {bridge && <kit.KitContent group="response" {...{ density }}>
          <AmountLine part="disallowed_costs" label={w.addBack} value={a.disallowed_costs} {...{ density }} />
          <AmountLine part="taxable_profit" label={w.taxable} value={a.taxable_profit} {...{ density }} />
        </kit.KitContent>}
      </>}
  </kit.KitCard>;
}

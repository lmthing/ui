import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { billLines, billsReading, billTotalLine, localBillDate, orderedBills } from "../copy";
import { moneyWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Bills.generated";
// prettier-ignore
export const meta = {
  id: "Bills",
  status: "ready",
  group: "data",
  ...prompt,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Bills saved on the device; reminders before due dates need notification permission.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["repeat"] } },
  parts: ["root", "total", "empty"],
  items: {
    key: "bills",
    parts: ["root", "name", "amount", "due", "repeat", "paid", "icon", "trial_ends", "manage", "manage_label"],
    variants: { tone: ["neutral", "good", "warn", "bad"], mark: ["none", "muted"] },
  },
  states: ["filled", "empty"],
  actions: {
    items: { paid: ["check"], root: ["press"], manage: ["press"] },
    when: { manage: { style: "subscriptions", manageable: true } },
  },
  read: (input, state, lang): string[] =>
    state === "filled" ? billsReading(input as z.output<typeof props>, lang) : [],
} as const satisfies c.Meta;
// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  bills: z.array(z.strictObject({
    ...c.itemVariantProps(meta.items.variants),
    name: c.text(24), amount: z.number().min(0).max(999_999_999.99),
    due: c.isoDate.optional(), trialEnds: c.isoDate.optional(),
    manage: z.strictObject({ goto: c.screenId }).optional(),
    repeat: z.enum(["never", "weekly", "monthly", "yearly"]),
    paid: z.boolean(), icon: c.icon,
  }).overwrite((bill) => (bill.manage ? { ...bill, manageable: true } : bill))).min(1).max(6),
  style: z.enum(["due", "subscriptions"]).default("due"),
}).refine(({ bills, style }) => style === "subscriptions" || bills.every(({ manage }) => !manage), {
  path: ["bills"], message: "Manage links require subscriptions style",
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  return {
    bills: (items.length ? items : [undefined]).map((item, index) => ({
      name: (item && c.titleOf(item, 24, thing)) || c.placeholderTitle(index, lang),
      amount: 0,
      repeat: "never",
      paid: false,
      icon: "dot",
    })),
  };
}

// prettier-ignore
const ledgeBills = {
  bills: [
    { name: "Ledge supplies", amount: 24.5, due: "2026-11-24", repeat: "monthly", paid: false, icon: "leaf" },
    { name: "Grow-light power", amount: 18, due: "2026-11-28", repeat: "monthly", paid: true, icon: "zap" },
  ],
} satisfies z.input<typeof props>;
function withItemFinish(finish: Pick<z.input<typeof props>["bills"][number], "tone" | "mark">) {
  return { bills: ledgeBills.bills.map((row, index) => (index === 0 ? { ...row, ...finish } : row)) };
}
// prettier-ignore
export const examples = [
  ledgeBills,
  {
    style: "subscriptions",
    bills: [
      { name: "Trot phone plan", amount: 12, repeat: "monthly", paid: false, icon: "phone" },
      { name: "Walking insurance", amount: 96, due: "2026-12-01", repeat: "yearly", paid: false, icon: "shield" },
    ],
  },
  { ...ledgeBills, detail: "brief" },
  { ...ledgeBills, density: "compact" },
  ...(["good", "warn", "bad"] as const).map((tone) => withItemFinish({ tone })),
  withItemFinish({ mark: "muted" }),
  {
    style: "subscriptions",
    bills: [
      { name: "Trot route planner", amount: 24, repeat: "monthly", paid: false, icon: "map", trialEnds: "2026-12-01", manage: { goto: "route_plan" } },
      { name: "Trot phone plan", amount: 12, repeat: "monthly", paid: true, icon: "phone" },
    ],
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = c.probesFor("Bills");
// prettier-ignore
export const probes = [
  choose("Track my rent, power bill and monthly subscriptions with amounts, due dates, paid ticks and a computed monthly total"),
  choose("Give me a simple list of household jobs to tick off, with no payment amounts or due payments", "Checklist"),
  write("Due bills: Rent 800 due 2026-12-01 monthly unpaid with home icon; Power 60 due 2026-11-28 monthly paid with zap icon. Do not write totals"),
  { ...write("Track Power at 60, due 2026-12-01, unpaid, recurring monthly with a zap icon. Show the due date and paid tick, but hide the repeat label."), variant: { axis: "detail", value: "brief" } },
  { ...write("In my subscriptions list, Trot route planner costs 24 every month, is unpaid and has a map icon. Its free trial ends 2026-12-01; show the trial end date."), expectProps: { bills: [{ trialEnds: "2026-12-01" }] } },
  { ...write("Show my Trot phone plan as a subscription, 12 monthly, unpaid, phone icon. Include a separate Manage shortcut opening the phone_plan screen so I can cancel or change it there."), expectProps: { style: "subscriptions", bills: [{ manage: { goto: "phone_plan" } }] } },
  read("Tick the paid checkbox next to Ledge supplies; do not open the bill", { address: "b1/r1/paid", action: "check" }),
] satisfies c.Probe[];

type BillsProps = c.Props<typeof props, typeof meta>;
// prettier-ignore
function BillRow({
  bill, today, detail, density, style,
}: Pick<BillsProps, "detail" | "density" | "style"> & { bill: BillsProps["bills"][number]; today: string }) {
  const scope = kit.usePartContext();
  const { lang, words } = kit.useWords(moneyWordsFor);
  const paid = kit.useControlValue(c.formatAddress({ ...scope, item: bill.id, part: "paid" }), bill.paid);
  const tone =
    bill.mark === "muted" ? "muted" : bill.tone === "neutral" ? (paid ? "muted" : "text") : bill.tone;
  const { amount, due, shortDue, repeat, overdue, trial } = billLines({ ...bill, paid }, today, lang, detail);
  const name = overdue ? words.bills.overdue(bill.name) : bill.name;
  const manage = style === "subscriptions" && bill.manage;
  const label = [name, amount, due && words.bills.due(due), repeat, !manage && trial].filter(Boolean).join(words.bills.separator);
  return (
    <kit.KitRow item={bill.id} part={null} label={bill.name} inline density={density}
      trailing={<kit.KitCheck part="paid" done={bill.paid} label={words.bills.markPaid(bill.name)} />}
    >
      <kit.KitRow
        part="root"
        role="button"
        label={label}
        inline
        density={density}
        leading={<kit.KitIcon part="icon" name={bill.icon} tone="muted" />}
        trailing={
          <kit.KitText density={density} role="number" numberScale="compact" tone={tone} align="end" tabular part="amount">
            {amount}
          </kit.KitText>
        }
      >
        <kit.KitText density={density} role="body" tone={tone} part="name">
          {bill.name}
        </kit.KitText>
        {(detail === "full" || shortDue) && <kit.KitText role="caption" tone="muted" part={null}>
          {repeat && (
            <kit.KitText role="caption" tone="muted" part="repeat">
              {repeat}
            </kit.KitText>
          )}
          {shortDue && repeat && words.bills.separator}
          {shortDue && (
            <kit.KitText role="caption" tone={overdue ? "bad" : paid ? "muted" : "text"} part="due">
              {shortDue.replace(/\s/g, "\u00a0")}
            </kit.KitText>
          )}
        </kit.KitText>}
        {trial && !manage && <kit.KitText part="trial_ends" role="caption" tone="muted">{trial}</kit.KitText>}
      </kit.KitRow>
      {manage && <kit.KitRow part={null} inline indent={1} density={density} label={bill.name}>
        <kit.KitGrid fitLast density={density}>
          <kit.KitText part={trial ? "trial_ends" : null} role="caption" tone="muted">{trial}</kit.KitText>
          <kit.KitRow part="manage" inline density={density} label={words.bills.manageBill(bill.name)} goto={manage.goto}>
            <kit.KitText part="manage_label" role="label" tone="accent">{words.bills.manage}</kit.KitText>
          </kit.KitRow>
        </kit.KitGrid>
      </kit.KitRow>}
    </kit.KitRow>
  );
}
// prettier-ignore
export function Bills({ bills, style, detail, density: requested }: BillsProps) {
  const density = kit.useVariant("density", meta.variants.density, requested);
  const state = kit.useComponentState();
  const { lang } = kit.useWords(moneyWordsFor);
  const today = localBillDate();
  const total = billTotalLine({ bills, style }, today, lang);
  return (
    <kit.KitCard part="root" density={density} padded={state === "filled"}>
      {state === "empty" ? (
        <kit.KitEmpty part="empty" decorativeIcon />
      ) : (
        <>
          {orderedBills(bills, style).map((bill) => (
            <BillRow key={bill.id} {...{ bill, today, detail, density, style }} />
          ))}
          <kit.KitContent group="response">
            <kit.KitGrid fitLast>
              <kit.KitText role="caption" tone="muted" part={null}>{total.label}</kit.KitText>
              <kit.KitText density={density} role="number" numberScale={style === "due" ? "compact" : "display"} tabular part="total">{total.amount}</kit.KitText>
            </kit.KitGrid>
          </kit.KitContent>
        </>
      )}
    </kit.KitCard>
  );
}

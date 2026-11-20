import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { billLines, billsReading, billTotalLine, localBillDate, orderedBills } from "../copy";
import { moneyWordsFor } from "../lang";
// Core first: Checklist/plain cannot show recurring payment amounts, due dates and computed cost totals.
export const meta = {
  id: "Bills",
  status: "ready",
  group: "data",
  purpose: "Keep on top of upcoming bills and recurring subscriptions.",
  pick: "Upcoming or recurring personal payments with amounts, due dates and paid ticks. Not generic tasks (Checklist), client invoicing (Invoice), past spending (Transactions), or debt forecasts (Loan).",
  writeHints: [
    "Write stored paid flags and numeric amounts; never totals, overdue flags or currency. due is optional; repeat is never, weekly, monthly or yearly. Hide repeat labels with detail brief, keeping repeat in the data.",
    "For hidden repeat labels alone, set density, tone and mark to null. Never write comfortable, neutral or none as defaults. Recurrence and paid status alone do not request an item treatment.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Bills saved on the device; reminders before due dates need notification permission.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["repeat"] } },
  parts: ["root", "total", "empty"],
  items: {
    key: "bills",
    parts: ["root", "name", "amount", "due", "repeat", "paid", "icon"],
    variants: { tone: ["neutral", "good", "warn", "bad"], mark: ["none", "muted"] },
  },
  states: ["filled", "empty"],
  actions: { items: { paid: ["check"], root: ["press"] } },
  read: (input, state, lang): string[] =>
    state === "filled" ? billsReading(input as z.output<typeof props>, lang) : [],
} as const satisfies c.Meta;
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  bills: z
    .array(
      z.strictObject({
        ...c.itemVariantProps(meta.items.variants),
        name: c.text(24),
        amount: z.number().min(0).max(999_999_999.99),
        due: c.isoDate.optional(),
        repeat: z.enum(["never", "weekly", "monthly", "yearly"]),
        paid: z.boolean(),
        icon: c.icon,
      }),
    )
    .min(1)
    .max(6),
  style: z.enum(["due", "subscriptions"]).default("due"),
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
export const examples = [
  {
    style: "due",
    bills: [
      { name: "Ledge supplies", amount: 24.5, due: "2026-11-24", repeat: "monthly", paid: false, icon: "leaf" },
      { name: "Grow-light power", amount: 18, due: "2026-11-28", repeat: "monthly", paid: true, icon: "zap" },
    ],
  },
  {
    style: "subscriptions",
    bills: [
      { name: "Trot phone plan", amount: 12, repeat: "monthly", paid: false, icon: "phone" },
      { name: "Walking insurance", amount: 96, due: "2026-12-01", repeat: "yearly", paid: false, icon: "shield" },
    ],
  },
  { detail: "brief", density: "compact", bills: [
    { name: "Garden power", amount: 64, due: "2026-11-28", repeat: "monthly", paid: false, icon: "zap", tone: "warn" },
    { name: "Equipment cover", amount: 80, repeat: "yearly", paid: true, icon: "shield", tone: "good" },
    { name: "Late phone bill", amount: 30, due: "2026-11-12", repeat: "monthly", paid: false, icon: "phone", tone: "bad", mark: "muted" },
  ] },
] satisfies z.input<typeof props>[];
const { choose, write, read } = c.probesFor("Bills");
// prettier-ignore
export const probes = [
  choose("Track my rent, power bill and monthly subscriptions with amounts, due dates, paid ticks and a computed monthly total"),
  choose("Give me a simple list of household jobs to tick off, with no payment amounts or due payments", "Checklist"),
  write("Due bills: Rent 800 due 2026-12-01 monthly unpaid with home icon; Power 60 due 2026-11-28 monthly paid with zap icon. Do not write totals"),
  { ...write("Track Power at 60, due 2026-12-01, unpaid, recurring monthly with a zap icon. Show the due date and paid tick, but hide the repeat label."), variant: { axis: "detail", value: "brief" } },
  read("Check off Ledge supplies as paid, without opening the bill", { address: "b1/r1/paid", action: "check" }),
] satisfies c.Probe[];

type BillsProps = c.Props<typeof props, typeof meta>;
function BillRow({
  bill,
  today,
  detail,
  density,
}: Pick<BillsProps, "detail" | "density"> & { bill: BillsProps["bills"][number]; today: string }) {
  const scope = kit.usePartContext();
  const { lang, words } = kit.useWords(moneyWordsFor);
  const paid = kit.useControlValue(c.formatAddress({ ...scope, item: bill.id, part: "paid" }), bill.paid);
  const tone = paid ? "muted" : "text";
  const { amount, due, shortDue, repeat, overdue } = billLines({ ...bill, paid }, today, lang, detail);
  const name = overdue ? words.bills.overdue(bill.name) : bill.name;
  const label = [name, amount, due && words.bills.due(due), repeat]
    .filter(Boolean)
    .join(words.bills.separator);
  // prettier-ignore
  return (
    <kit.KitRow
      item={bill.id}
      part={null}
      label={bill.name}
      inline
      density={density}
      tone={bill.tone}
      mark={bill.mark}
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
      </kit.KitRow>
    </kit.KitRow>
  );
}

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
            <BillRow key={bill.id} {...{ bill, today, detail, density }} />
          ))}
          <kit.KitContent group="response">
            <kit.KitGrid fitLast>
              <kit.KitText role="caption" tone="muted" part={null}>
                {total.label}
              </kit.KitText>
              <kit.KitText
                density={density}
                role="number"
                numberScale={style === "due" ? "compact" : "display"}
                tabular
                part="total"
              >
                {total.amount}
              </kit.KitText>
            </kit.KitGrid>
          </kit.KitContent>
        </>
      )}
    </kit.KitCard>
  );
}

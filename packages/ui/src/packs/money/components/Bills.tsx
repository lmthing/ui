import { z } from "zod";
import {
  icon,
  isoDate,
  itemsOf,
  formatAddress,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import {
  KitCard,
  KitCheck,
  KitContent,
  KitEmpty,
  KitGrid,
  KitIcon,
  KitRow,
  KitText,
  useComponentState,
  useControlValue,
  usePartContext,
  useWords,
} from "../../../kit";
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
    "Write stored paid flags and numeric amounts, never totals, overdue flags or currency. due is optional; repeat is never, weekly, monthly or yearly.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Bills saved on the device; reminders before due dates need notification permission.",
  parts: ["root", "total", "empty"],
  items: { key: "bills", parts: ["root", "name", "amount", "due", "repeat", "paid", "icon"] },
  states: ["filled", "empty"],
  actions: { items: { paid: ["check"], root: ["press"] } },
  read: (input, state, lang) =>
    state === "filled" ? billsReading(input as z.output<typeof props>, lang) : [],
} as const satisfies Meta;
export const props = z.strictObject({
  bills: z
    .array(
      z.strictObject({
        name: text(24),
        amount: z.number().min(0).max(999_999_999.99),
        due: isoDate.optional(),
        repeat: z.enum(["never", "weekly", "monthly", "yearly"]),
        paid: z.boolean(),
        icon,
      }),
    )
    .min(1)
    .max(6),
  style: z.enum(["due", "subscriptions"]).default("due"),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 3);
  return {
    bills: (items.length ? items : [undefined]).map((item, index) => ({
      name: (item && titleOf(item, 24, thing)) || placeholderTitle(index, lang),
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
      { name: "Ledge supplies delivery", amount: 24.5, due: "2026-11-24", repeat: "monthly", paid: false, icon: "leaf" },
      { name: "Grow-light electricity", amount: 18, due: "2026-11-28", repeat: "monthly", paid: true, icon: "zap" },
    ],
  },
  {
    style: "subscriptions",
    bills: [
      { name: "Trot phone plan", amount: 12, repeat: "monthly", paid: false, icon: "phone" },
      { name: "Walking insurance", amount: 96, due: "2026-12-01", repeat: "yearly", paid: false, icon: "shield" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Bills");
export const probes = [
  choose(
    "Track my rent, power bill and monthly subscriptions with amounts, due dates, paid ticks and a computed monthly total",
  ),
  choose(
    "Give me a simple list of household jobs to tick off, with no payment amounts or due payments",
    "Checklist",
  ),
  write(
    "Due bills: Rent 800 due 2026-12-01 monthly unpaid with home icon; Power 60 due 2026-11-28 monthly paid with zap icon. Do not write totals",
  ),
  read("Check off Ledge supplies delivery as paid, without opening the bill", {
    address: "b1/r1/paid",
    action: "check",
  }),
] satisfies Probe[];

type Bill = Props<typeof props, typeof meta>["bills"][number];
function BillRow({ bill, today }: { bill: Bill; today: string }) {
  const scope = usePartContext();
  const { lang, words } = useWords(moneyWordsFor);
  const target = formatAddress({ ...scope, item: bill.id, part: "paid" });
  const paid = useControlValue(target, bill.paid);
  const { amount, due, shortDue, repeat, overdue } = billLines({ ...bill, paid }, today, lang);
  const name = overdue ? words.bills.overdue(bill.name) : bill.name;
  const label = [name, amount, due && words.bills.due(due), repeat]
    .filter(Boolean)
    .join(words.bills.separator);
  return (
    <KitRow
      item={bill.id}
      part={null}
      label={bill.name}
      inline
      trailing={<KitCheck part="paid" done={bill.paid} label={words.bills.markPaid(bill.name)} />}
    >
      <KitRow
        part="root"
        role="button"
        label={label}
        inline
        leading={<KitIcon part="icon" name={bill.icon} tone="muted" />}
      >
        <KitText role="body" part="name">
          {bill.name}
        </KitText>
        <KitGrid fitLast>
          <KitText role="caption" tone="muted" part={null}>
            {repeat && (
              <KitText role="caption" tone="muted" part="repeat">
                {repeat.replace(/\s/g, "\u00a0")}
              </KitText>
            )}
            {shortDue && repeat && words.bills.separator}
            {shortDue && (
              <KitText role="caption" tone={overdue ? "bad" : paid ? "muted" : "text"} part="due">
                {shortDue.replace(/\s/g, "\u00a0")}
              </KitText>
            )}
          </KitText>
          <KitText role="number" numberScale="compact" align="end" tabular part="amount">
            {amount}
          </KitText>
        </KitGrid>
      </KitRow>
    </KitRow>
  );
}

export function Bills({ bills, style }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const { lang } = useWords(moneyWordsFor);
  const today = localBillDate();
  const total = billTotalLine({ bills, style }, today, lang);
  return (
    <KitCard part="root" padded={state === "filled"}>
      {state === "empty" ? (
        <KitEmpty part="empty" decorativeIcon />
      ) : (
        <>
          {orderedBills(bills, style).map((bill) => (
            <BillRow key={bill.id} bill={bill} today={today} />
          ))}
          <KitContent group="response">
            <KitText role="caption" tone="muted" part={null}>
              {total.label}
            </KitText>
            <KitText role="number" numberScale={style === "due" ? "compact" : "display"} tabular part="total">
              {total.amount}
            </KitText>
          </KitContent>
        </>
      )}
    </KitCard>
  );
}

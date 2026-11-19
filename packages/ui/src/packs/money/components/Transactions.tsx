import {
  wordsFor,
  detailOf,
  icon,
  isoDate,
  itemsOf,
  placeholderTitle,
  probesFor,
  screenId,
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
  KitContent,
  KitEmpty,
  KitGrid,
  KitIcon,
  KitRow,
  KitSkeleton,
  KitText,
  useComponentState,
  useWords,
} from "../../../kit";
import { transactionAmount, transactionDay, transactionGroups, transactionReading } from "../copy";
import { moneyWordsFor } from "../lang";
import { z } from "zod";

// Core first: Bars/share cannot show dated individual payees and signed amounts grouped by day.
export const meta = {
  id: "Transactions",
  status: "ready",
  group: "data",
  purpose: "See where your money went, entry by entry.",
  pick: "Personal money in and out, grouped by day with payees and signed amounts. Not category totals (Bars), or a client's events (ClientHistory).",
  writeHints: [
    "Amounts are signed numbers: negative spending, positive income. Dates use YYYY-MM-DD; never write totals or currency.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Entries added on the device or imported from a bank file on the device.",
  parts: ["root", "empty"],
  items: { key: "entries", parts: ["root", "date", "payee", "category", "icon", "amount"] },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
  read: (input, state, lang) =>
    state === "filled" ? transactionReading((input as z.output<typeof props>).entries, lang) : [],
} as const satisfies Meta;

export const props = z.strictObject({
  entries: z
    .array(
      z.strictObject({
        date: isoDate,
        payee: text(28),
        category: text(16),
        icon,
        amount: z.number(),
        goto: screenId,
      }),
    )
    .min(1)
    .max(6),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);
  const thing = thingOf(cast);
  const items = itemsOf(cast, 3);
  return {
    entries: (items.length ? items : [undefined]).map((item, index) => ({
      date: "2026-11-19",
      payee: (item && titleOf(item, 28, thing)) || placeholderTitle(index, lang),
      category: (item && detailOf(item, 16, thing)) || placeholderDetail,
      icon: "dot",
      amount: 0,
      goto: "details",
    })),
  };
}

// Use past dates so the read probe stays stable after today's date changes.
// prettier-ignore
export const examples = [
  {
    entries: [
      { date: "2026-11-17", payee: "Ledge Potting", category: "Plant care",
        icon: "leaf", amount: -24.5, goto: "supplies" },
      { date: "2026-11-17", payee: "Returned plant pot", category: "Refund",
        icon: "banknote", amount: 8, goto: "refund" },
      { date: "2026-11-16", payee: "Garden centre seeds", category: "Plant care",
        icon: "leaf", amount: -12, goto: "seeds" },
    ],
  },
  {
    entries: [
      { date: "2026-11-16", payee: "Trot walking income", category: "Income",
        icon: "banknote", amount: 120, goto: "income" },
      { date: "2026-11-13", payee: "New walking boots", category: "Equipment",
        icon: "shopping_bag", amount: -65, goto: "boots" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Transactions");
export const probes = [
  choose(
    "Show my bank spending and income entry by entry, grouped by date, with payees, category icons and signed amounts",
  ),
  choose(
    "Show how my spending divides between groceries, travel and rent as category shares, not individual entries",
    "Bars",
  ),
  write(
    "Personal entries: groceries at Corner Shop on 2026-11-19 for minus 24.50, category Food, shopping_bag, opening groceries; salary on 2026-11-18 for plus 1200, category Income, banknote, opening salary",
  ),
  read("Open the Ledge potting supplies transaction", { address: "t1/r1", action: "press" }),
] satisfies Probe[];

type TransactionsProps = Props<typeof props, typeof meta>;
type Entry = TransactionsProps["entries"][number];

function TransactionRow({ entry, date, later }: { entry: Entry; date?: string; later: boolean }) {
  const { lang, words } = useWords(moneyWordsFor);
  const loading = useComponentState() === "loading";
  const amount = transactionAmount(entry.amount, lang);
  const label = words.transactions.entry(entry.payee, entry.category, amount);
  const heading = date && (
    <KitContent group={later ? "response" : "content"}>
      {loading ? (
        <KitSkeleton shape="figure" inset="none" content={[["label", date]]} />
      ) : (
        <KitText part="date" tone="muted" role="label" lines={1}>
          {date}
        </KitText>
      )}
    </KitContent>
  );
  const icon = <KitIcon name={entry.icon} part="icon" tone="muted" />;
  // prettier-ignore
  return (
    <KitRow {...(loading ? {} : { item: entry.id, goto: entry.goto })} label={loading ? "" : label} inset="none" inline={loading}>
      <KitContent>
        {heading}
        {loading ? (
          <KitSkeleton rows={1} inset="none" items={[{ title: entry.payee, meta: entry.category, trail: "value" }]} />
        ) : (
          <KitContent lead={icon} lineRole="body">
            <KitGrid fitLast>
              <KitText part="payee">{entry.payee}</KitText>
              <KitText part="amount" role="number" numberScale="compact" tone={entry.amount > 0 ? "good" : "text"}
                tabular align="end" lines={1}>{amount}</KitText>
            </KitGrid>
            <KitText part="category" tone="muted" role="caption">{entry.category}</KitText>
          </KitContent>
        )}
      </KitContent>
    </KitRow>
  );
}

export function Transactions({ entries }: TransactionsProps) {
  const state = useComponentState();
  const { lang } = useWords(moneyWordsFor);
  if (state === "empty")
    return <KitCard part="root" children={<KitEmpty part="empty" icon="banknote" decorativeIcon />} />;
  return (
    <KitCard part="root" padded>
      <KitContent>
        {transactionGroups(entries).flatMap((group, day) =>
          group.entries.map((entry, index) => (
            <TransactionRow
              key={entry.id}
              entry={entry}
              later={day > 0}
              {...(index === 0 ? { date: transactionDay(group.date, lang) } : {})}
            />
          )),
        )}
      </KitContent>
    </KitCard>
  );
}

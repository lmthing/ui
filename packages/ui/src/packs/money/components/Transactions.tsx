import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { transactionCopy, transactionDay, transactionGroups, transactionReading } from "../copy";
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
    "Amounts are signed: negative spending, positive income. Dates use YYYY-MM-DD. Never write totals or currency. To hide icons alone, use lead none and keep each source icon.",
    "Unrequested density, item tone and item mark must be null. Never infer tone from spending, a refund or income; the amount's sign has its own automatic treatment.",
    "Write a status (posted, pending or disputed), a short note, or a receipt photo reference only when supplied. A receipt thumbnail takes the icon's place when leading visual cues are shown; the source icon is still required.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Entries added on the device or imported from a bank file on the device.",
  variants: { density: ["comfortable", "compact"], lead: ["icon", "none"] },
  variantParts: { "lead.none": { hides: ["icon", "receipt"] } },
  parts: ["root", "empty"],
  items: {
    key: "entries",
    parts: ["root", "date", "payee", "category", "icon", "amount", "status", "note", "receipt"],
    variants: { tone: ["neutral", "good", "warn", "bad"], mark: ["none", "highlight", "muted", "new"] },
  },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
  read(input, state, lang): string[] {
    const { entries, lead } = input as z.output<typeof props>;
    return state === "filled" ? transactionReading(entries, lang, undefined, lead === "icon") : [];
  },
} as const satisfies c.Meta;

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  entries: z.array(z.strictObject({
    ...c.itemVariantProps(meta.items.variants),
    date: c.isoDate, payee: c.text(28), category: c.text(16), icon: c.icon,
    amount: z.number(), status: z.enum(["posted", "pending", "disputed"]).optional(),
    note: c.text(60).optional(), receipt: c.photo.optional(), goto: c.screenId,
  })).min(1).max(6),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = c.wordsFor(lang);
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  return {
    entries: (items.length ? items : [undefined]).map((item, index) => ({
      date: "2026-11-19",
      payee: (item && c.titleOf(item, 28, thing)) || c.placeholderTitle(index, lang),
      category: (item && c.detailOf(item, 16, thing)) || placeholderDetail,
      icon: "dot",
      amount: 0,
      goto: "details",
    })),
  };
}

// Use past dates so the read probe stays stable after today's date changes.
// prettier-ignore
const ledgeEntries = {
  entries: [
    { date: "2026-11-17", payee: "Ledge Potting", category: "Plant care",
      icon: "leaf", amount: -24.5, goto: "supplies" },
    { date: "2026-11-17", payee: "Returned plant pot", category: "Refund",
      icon: "banknote", amount: 8, goto: "refund" },
    { date: "2026-11-17", payee: "Garden seeds", category: "Plant care",
      icon: "leaf", amount: -12, goto: "seeds" },
  ],
} satisfies z.input<typeof props>;
function withItemFinish(finish: Pick<z.input<typeof props>["entries"][number], "tone" | "mark">) {
  return { entries: ledgeEntries.entries.map((row, index) => (index === 0 ? { ...row, ...finish } : row)) };
}
// prettier-ignore
export const examples = [
  ledgeEntries,
  {
    entries: [
      { date: "2026-11-16", payee: "Trot walking income", category: "Income",
        icon: "banknote", amount: 120, goto: "income" },
      { date: "2026-11-13", payee: "New walking boots", category: "Equipment",
        icon: "shopping_bag", amount: -65, goto: "boots" },
    ],
  },
  { ...ledgeEntries, lead: "none" },
  { ...ledgeEntries, density: "compact" },
  ...(["good", "warn", "bad"] as const).map((tone) => withItemFinish({ tone })),
  ...(["highlight", "muted", "new"] as const).map((mark) => withItemFinish({ mark })),
  { entries: [
    { date: "2026-11-16", payee: "Trot walking income", category: "Income", icon: "banknote", amount: 120, goto: "income", status: "posted" },
    { date: "2026-11-13", payee: "New walking boots", category: "Equipment", icon: "shopping_bag", amount: -65, goto: "boots", status: "pending", note: "Waterproof pair for early walks", receipt: "lib:receipt" },
    { date: "2026-11-13", payee: "Park permit", category: "Fees", icon: "tree", amount: -14, goto: "permit", status: "disputed", note: "Charged twice at the gate" },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Transactions");
// prettier-ignore
export const probes = [
  choose(
    "Show my bank spending and income entry by entry, grouped by date, with payees, category icons and signed amounts",
  ),
  choose(
    "Compare the shares of my total spending on groceries, travel and rent as parts of one whole, not individual entries or separate headline totals",
    "Bars",
  ),
  write(
    "Personal entries: groceries at Corner Shop on 2026-11-19 for minus 24.50, category Food, shopping_bag, opening groceries; salary on 2026-11-18 for plus 1200, category Income, banknote, opening salary",
  ),
  {
    ...write(
      "Show Corner Shop, category Food, minus 24.50 on 2026-11-19, opening groceries. Store shopping_bag as the category icon but display the row without any icon.",
    ),
    variant: { axis: "lead", value: "none" },
  },
  { ...write("Corner Shop, Food, shopping_bag, minus 24.50 on 2026-11-19, opens groceries. The transaction is disputed; show this status."), expectProps: { entries: [{ status: "disputed" }] } },
  { ...write('Corner Shop, Food, shopping_bag, minus 24.50 on 2026-11-19, opens groceries. Add the transaction note exactly: "Split with Sam".'), expectProps: { entries: [{ note: "Split with Sam" }] } },
  { ...write("Corner Shop, Food, shopping_bag, minus 24.50 on 2026-11-19, opens groceries. Show the receipt thumbnail using saved photo local:1."), expectProps: { entries: [{ receipt: "local:1" }] } },
  read("Open the Ledge potting supplies transaction", { address: "t1/r1", action: "press" }),
] satisfies c.Probe[];

type TransactionsProps = c.Props<typeof props, typeof meta>;
type Entry = TransactionsProps["entries"][number];

// prettier-ignore
function TransactionRow({ entry, density, lead, framed, mixed }:
  Pick<TransactionsProps, "density" | "lead"> & { entry: Entry; framed: boolean; mixed: boolean }) {
  const { lang, words } = kit.useWords(moneyWordsFor);
  const { amount, label, status } = transactionCopy(entry, lang, lead === "icon");
  if (kit.useComponentState() === "loading") return (
    <kit.KitRow part={null} inline={!framed} label="" trailing={<kit.KitSkeleton shape="figure" inset="none" density={density}
      content={[["number", amount, "end", "compact"]]} />}>
      <kit.KitSkeleton shape="figure" inset="none" density={density} lead={mixed ? "box" : lead === "icon" ? "dot" : "none"}
        content={[["body", entry.payee], ["caption", entry.category], ...[status, entry.note].flatMap((text): ["caption", string][] => text ? [["caption", text]] : [])]} />
    </kit.KitRow>
  );
  const receipt = lead === "icon" && entry.receipt;
  const leading = receipt
    ? <kit.KitPhoto photo={receipt} shape="thumb" part="receipt" label={words.transactions.receipt} />
    : lead === "icon" ? <kit.KitIcon name={entry.icon} part="icon" tone="muted" /> : undefined;
  return (
    <kit.KitRow item={entry.id} goto={entry.goto} label={label} inline={!framed} density={density} tone={entry.tone} mark={entry.mark}
      {...(mixed ? { leading, leadingWidth: "avatar", leadingAlign: receipt ? "row" : "line" } : {})}>
      <kit.KitContent lead={mixed ? undefined : leading} lineRole="body" density={density}>
        <kit.KitGrid fitLast density={density}>
          <kit.KitText part="payee" density={density}>{entry.payee}</kit.KitText>
          <kit.KitText density={density} part="amount" role="number" numberScale="compact" tone={entry.amount > 0 ? "good" : "text"}
            tabular align="end" lines={1}>{amount}</kit.KitText>
        </kit.KitGrid>
        <kit.KitText part="category" tone="muted" role="caption">{entry.category}</kit.KitText>
        {status && <kit.KitText part="status" role="caption" tone={entry.status === "disputed" ? "bad" : "muted"}>{status}</kit.KitText>}
        {entry.note && <kit.KitText part="note" tone="muted" role="caption">{entry.note}</kit.KitText>}
      </kit.KitContent>
    </kit.KitRow>
  );
}

function DateHeading({ item, day }: { item: string; day: string }) {
  const scope = kit.usePartContext();
  return scope.state === "loading" ? (
    <kit.KitSkeleton shape="figure" inset="none" content={[["caption", day]]} />
  ) : (
    <kit.PartScope {...scope} item={item}>
      <kit.KitText part="date" role="caption" lines={1} children={day} />
    </kit.PartScope>
  );
}

// prettier-ignore
export function Transactions({ entries, density: requested, lead }: TransactionsProps) {
  const density = kit.useVariant("density", meta.variants.density, requested);
  const state = kit.useComponentState();
  const { lang } = kit.useWords(moneyWordsFor);
  const framed = entries.some(({ tone, mark }) => tone !== "neutral" || mark !== "none");
  const mixed = lead === "icon" && entries.some(({ receipt }) => receipt);
  if (state === "empty")
    return (
      <kit.KitCard part="root" children={<kit.KitEmpty part="empty" icon="banknote" decorativeIcon />} />
    );
  return (
    <kit.KitCard part="root" padded density={density}>
      {transactionGroups(entries).map(({ date, entries }, index) => (
        <kit.KitContent key={date} group={index === 0 ? "content" : "response"}>
          <DateHeading item={entries[0]!.id} day={transactionDay(date, lang)} />
          {entries.map((entry, row) => (
            <kit.KitContent key={entry.id} group={row === 0 || density === "compact" ? "content" : "response"}>
              <TransactionRow {...{ entry, density, lead, framed, mixed }} />
            </kit.KitContent>
          ))}
        </kit.KitContent>
      ))}
    </kit.KitCard>
  );
}

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
} from "../../../catalog";
import { z } from "zod";

// Core first: Bars/share cannot show dated individual payees and signed amounts grouped by day.
export const meta = {
  id: "Transactions",
  status: "draft",
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
  const entries = itemsOf(cast, 3).map((item, index) => ({
    date: "2026-11-19",
    payee: titleOf(item, 28, thing) || placeholderTitle(index, lang),
    category: detailOf(item, 16, thing) || placeholderDetail,
    icon: "dot" as const,
    amount: 0,
    goto: "details",
  }));
  return {
    entries: entries.length
      ? entries
      : [
          {
            date: "2026-11-19",
            payee: placeholderTitle(0, lang),
            category: placeholderDetail,
            icon: "dot",
            amount: 0,
            goto: "details",
          },
        ],
  };
}

export const examples = [
  {
    entries: [
      {
        date: "2026-11-19",
        payee: "Ledge potting supplies",
        category: "Plant care",
        icon: "leaf",
        amount: -24.5,
        goto: "supplies",
      },
      {
        date: "2026-11-18",
        payee: "Returned plant pot",
        category: "Refund",
        icon: "banknote",
        amount: 8,
        goto: "refund",
      },
    ],
  },
  {
    entries: [
      {
        date: "2026-11-19",
        payee: "Trot walking income",
        category: "Income",
        icon: "banknote",
        amount: 120,
        goto: "income",
      },
      {
        date: "2026-11-18",
        payee: "New walking boots",
        category: "Equipment",
        icon: "shopping_bag",
        amount: -65,
        goto: "boots",
      },
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

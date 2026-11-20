import { z } from "zod";
import * as c from "../../../catalog";
import { attachment, privateFile, seedDate, seedRows } from "../seeds";

// Core first: Amount/default shows a number, not evidence files with reviewed status and allocated shares.
export const meta = {
  id: "Receipts",
  status: "draft",
  group: "data",
  purpose: "Keep purchase evidence and review the share assigned to each receipt.",
  pick: "Receipt evidence with private scans, amounts, review ticks and optionally allocated shares. Not one standalone amount (Amount), purchase warranties (Warranties), bank movements (Transactions), store orders (OrderSummary) or client bills (Invoice).",
  writeHints: [
    "Write the amount as a number with no currency. allocation is the assigned percentage (0–100), not a deduction or an amount. Never write allocated amounts or totals.",
    'File is an opaque local:<id> or supplied synthetic lib:<id>, never a URL. Write style "cards" for separate receipt tiles only; leave style, density and surface null by default.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "The person enters or scans receipts and checks them locally, with the brief's currency and no bank or tax service.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"] },
  parts: ["root", "empty", "error"],
  items: {
    key: "items",
    parts: [
      "root",
      "payee",
      "date",
      "amount",
      "category",
      "file",
      "allocation",
      "allocated_amount",
      "reviewed",
      "tags",
      "remove",
    ],
  },
  states: ["filled", "empty", "loading", "error"],
  confirmParts: ["remove"],
  actions: {
    items: { root: ["press"], reviewed: ["check"], remove: ["press"] },
    when: { root: { can_open: true } },
    noGoto: { items: ["remove"] },
  },
  read: (input, _state, lang): string[] =>
    (input as z.output<typeof props>).items.flatMap(({ date, amount, allocation, file }) => [
      date,
      c.numberLine(amount, lang),
      ...(allocation === undefined ? [] : [`${c.numberLine(allocation, lang)}%`]),
      ...(file ? [privateFile] : []),
    ]),
} as const satisfies c.Meta;

const receipt = z
  .strictObject({
    payee: c.text(32),
    date: c.isoDate,
    amount: z.number().min(0),
    category: c.text(16).optional(),
    file: attachment.optional(),
    allocation: z.number().min(0).max(100).optional(),
    reviewed: z.boolean(),
    tags: z.array(c.text(16)).min(0).max(3),
    goto: c.screenId.optional(),
  })
  .overwrite((row) => ({ ...row, can_open: Boolean(row.file || row.goto) }));

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  items: z.array(receipt).min(1).max(6),
  style: z.enum(["rows", "cards"]).default("rows"),
});

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    items: seedRows(input, 32, 16).map(({ title }) => ({
      payee: title,
      date: seedDate,
      amount: 0,
      reviewed: false,
      tags: [],
    })),
  };
}

export const examples = [
  {
    items: [
      {
        payee: "Fern Nursery",
        date: "2026-11-19",
        amount: 24.5,
        category: "Supplies",
        file: "lib:ledge_supplies",
        allocation: 50,
        reviewed: false,
        tags: ["pots"],
        goto: "pots",
      },
    ],
  },
  {
    style: "cards",
    density: "compact",
    surface: "plain",
    items: [
      {
        payee: "Walk Supply",
        date: "2026-11-05",
        amount: 36,
        file: "lib:trot_supplies",
        reviewed: true,
        tags: ["expenses"],
      },
      { payee: "Park Permit Office", date: "2026-11-12", amount: 12, reviewed: false, tags: ["fees"] },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Receipts");
export const probes = [
  choose(
    "Save proof scans for purchases with who I paid, date, amount, the percentage I assigned and a tick for whether I checked the receipt.",
  ),
  choose("Show just one formatted figure on its own: the 24.50 I spent. No list or proof files.", "Amount"),
  write(
    "Record a Fern Nursery receipt for 24.50 on 2026-11-19 with supplied scan lib:ledge_supplies. Allocate 50 percent, not reviewed, tag pots.",
  ),
  read("Mark the Fern Nursery receipt as reviewed.", { address: "r1/r1/reviewed", action: "check" }),
] satisfies c.Probe[];

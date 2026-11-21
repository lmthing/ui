import { z } from "zod";
import * as c from "../../../catalog";
import { compareInstants, dateTime, distinct, recordId, seedPortfolio, seedTime } from "../seeds";

// Core first: Timeline/history cannot reconcile trade quantities, cost and cash or retain corrections.
export const meta = {
  id: "InvestmentActivity",
  status: "draft",
  group: "data",
  purpose: "Reconcile investment trades, contributions, withdrawals and fees with my holdings and cash.",
  pick: "An investment ledger reconciling buys, sells, deposits, withdrawals, fees and linked dividend receipts. Not everyday spending (Transactions), client payments (ClientHistory), an audit (ActivityLog), or a dated event log (Timeline).",
  writeHints: [
    "Use unique snake_case entry ids and ISO datetimes with offsets. Entries cannot predate since. Do not seed dividend receipts here: they come from Dividends.",
    "For buy or sell, write assetId, units, unitPrice and optional fee, never amount. For deposit, withdrawal or fee, write amount and leave all four trade fields null. Write positive amounts; kind determines direction.",
    'For event and cash movement only, write "detail":"brief","density":null and retain the trade seeds. Only an explicit spacing request sets density; never fill in "comfortable". Do not write computed balances or proceeds.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath:
    "Device records fold after the opening statement, with linked dividend receipts and corrections retained; an action never sends a broker order.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["units", "unit_price", "fee"] } },
  parts: ["root", "add"],
  items: {
    key: "entries",
    parts: ["root", "at", "event", "units", "unit_price", "fee", "cash", "status", "void"],
  },
  confirmParts: ["void"],
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    parts: { add: ["press"] },
    items: { root: ["press"], void: ["press"] },
    when: { root: { linked: true }, void: { voided: false }, add: { linked: true } },
    noGoto: { items: ["void"] },
  },
  emptyActions: ["add.press"],
} as const satisfies c.Meta;

const entry = z
  .strictObject({
    id: recordId,
    at: dateTime.meta({ kind: "text" }),
    kind: z.enum(["deposit", "withdrawal", "buy", "sell", "fee"]),
    voided: z.boolean().default(false),
    assetId: recordId.optional(),
    units: z.number().positive().optional(),
    unitPrice: z.number().nonnegative().optional(),
    fee: z.number().nonnegative().optional(),
    amount: z.number().positive().optional(),
    goto: c.screenId.optional(),
  })
  .refine(
    ({ kind, assetId, units, unitPrice, fee, amount }) =>
      kind === "buy" || kind === "sell"
        ? assetId !== undefined && units !== undefined && unitPrice !== undefined && amount === undefined
        : amount !== undefined &&
          assetId === undefined &&
          units === undefined &&
          unitPrice === undefined &&
          fee === undefined,
    { message: "Use trade fields only for a buy or sell; use amount only for a cash event" },
  );
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    portfolioId: recordId,
    since: dateTime,
    openingCash: z.number().nonnegative(),
    openingContributed: z.number(),
    entries: z.array(entry).min(0).max(20),
    goto: c.screenId.optional(),
  })
  .refine(
    ({ since, entries }) =>
      distinct(entries, ({ id }) => id) && entries.every(({ at }) => compareInstants(at, since) >= 0),
    { path: ["entries"], message: "Use unique entry ids and dates at or after the opening statement" },
  )
  .overwrite((input) => ({
    ...input,
    linked: Boolean(input.goto),
    entries: input.entries.map((row) => ({
      ...row,
      record_id: row.id,
      linked: Boolean(row.goto),
      fee: row.kind === "buy" || row.kind === "sell" ? (row.fee ?? 0) : undefined,
    })),
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    portfolioId: seedPortfolio(input),
    since: seedTime,
    openingCash: 0,
    openingContributed: 0,
    entries: [],
  };
}

export const examples = [
  {
    portfolioId: "education",
    since: "2026-01-01T00:00:00Z",
    openingCash: 0,
    openingContributed: 0,
    goto: "record_trade",
    entries: [
      { id: "first_deposit", at: "2026-01-02T09:00:00Z", kind: "deposit", amount: 1000 },
      {
        id: "first_buy",
        at: "2026-01-02T10:00:00Z",
        kind: "buy",
        assetId: "global_fund",
        units: 10,
        unitPrice: 80,
        goto: "trade_details",
      },
    ],
  },
  {
    portfolioId: "pension",
    since: "2026-02-01T00:00:00Z",
    openingCash: 40,
    openingContributed: 550,
    density: "compact",
    detail: "brief",
    entries: [
      {
        id: "cancelled_sale",
        at: "2026-02-10T12:00:00Z",
        kind: "sell",
        assetId: "bond_fund",
        units: 0.5,
        unitPrice: 23,
        fee: 1,
        voided: true,
      },
      { id: "cash_out", at: "2026-02-11T12:00:00Z", kind: "withdrawal", amount: 10 },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("InvestmentActivity");
const brief =
  "Use portfolio education, opening statement at 2026-01-01T00:00:00Z with zero opening cash and contributed. Record first_deposit, 1000 on 2026-01-02T09:00:00Z, and first_buy, 10 units of global_fund at 80 on 2026-01-02T10:00:00Z.";
export const probes = [
  choose(
    "Record my portfolio's deposits, withdrawals, purchases and sales. Track units and fees so every trade reconciles with the balance and can be corrected.",
  ),
  choose(
    "Show the dates and titles of previous book club meetings as a simple event history, no cash or trade entries.",
    "Timeline",
  ),
  write(brief),
  {
    ...write(
      `${brief} Show the event and cash movement only, without the trade breakdown; keep it in the records.`,
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the form to add a trade, rather than opening an existing entry.", {
    address: "i1/add",
    action: "press",
  }),
] satisfies c.Probe[];

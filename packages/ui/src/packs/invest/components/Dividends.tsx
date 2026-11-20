import { z } from "zod";
import * as c from "../../../catalog";
import { dateTime, distinct, recordId, seedAssets, seedPortfolio, seedTime } from "../seeds";

// Core first: Timeline/history shows past dates, not per-unit distributions, eligibility or cash receipt.
export const meta = {
  id: "Dividends",
  status: "draft",
  group: "data",
  purpose: "See investment distributions and record which payments actually arrived.",
  pick: "Investment distributions tied to entitled units, per-unit amounts, withholding and actual receipts. Not bills to pay (Bills), deposits (InvestmentActivity), or an ordinary dated event history (Timeline).",
  writeHints: [
    "Use unique snake_case distribution ids, ISO datetimes with offsets for entitledAt/receivedAt, and YYYY-MM-DD for payOn. Omit receivedAt for unpaid entries. Never write entitled units, computed gross/net cash or status.",
    'Use style "received" for received entries only, newest first; otherwise leave style null.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Device records freeze ledger entitlement at the entitlement time; actual receipt credits cash once per distribution, and void reverses that receipt without deleting the distribution.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root"],
  items: {
    key: "distributions",
    parts: [
      "root",
      "asset",
      "entitled_at",
      "pay_on",
      "per_unit",
      "units",
      "gross",
      "net",
      "status",
      "receive",
      "void",
    ],
    visibleWhen: { visible: true },
  },
  confirmParts: ["void"],
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    items: { root: ["press"], receive: ["press"], void: ["press"] },
    when: { root: { linked: true }, receive: { received: false }, void: { received: true } },
    noGoto: { items: ["receive", "void"] },
  },
} as const satisfies c.Meta;

const distribution = z
  .strictObject({
    id: recordId,
    assetId: recordId,
    entitledAt: dateTime,
    payOn: c.isoDate,
    perUnit: z.number().positive(),
    withheld: z.number().nonnegative().default(0),
    receivedAt: dateTime.optional(),
    goto: c.screenId.optional(),
  })
  .refine(
    ({ entitledAt, payOn, receivedAt }) =>
      payOn >= entitledAt.slice(0, 10) &&
      (!receivedAt || (Date.parse(receivedAt) >= Date.parse(entitledAt) && receivedAt.slice(0, 10) >= payOn)),
    {
      path: ["receivedAt"],
      message: "Pay on or after entitlement and record receipt on or after payment day",
    },
  );
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    portfolioId: recordId,
    distributions: z.array(distribution).min(1).max(6),
    style: z.enum(["upcoming", "received"]).default("upcoming"),
  })
  .refine(({ distributions }) => distinct(distributions, ({ id }) => id), { path: ["distributions"] })
  .overwrite((input) => ({
    ...input,
    distributions: input.distributions.map((row) => ({
      ...row,
      record_id: row.id,
      linked: Boolean(row.goto),
      received: Boolean(row.receivedAt),
      visible: input.style !== "received" || Boolean(row.receivedAt),
    })),
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    portfolioId: seedPortfolio(input),
    distributions: seedAssets(input, 1).map(({ assetId }) => ({
      id: "item_1",
      assetId,
      entitledAt: seedTime,
      payOn: seedTime.slice(0, 10),
      perUnit: 1,
    })),
  };
}

export const examples = [
  {
    portfolioId: "education",
    distributions: [
      {
        id: "mar_distribution",
        assetId: "global_fund",
        entitledAt: "2026-03-01T00:00:00Z",
        payOn: "2026-03-10",
        perUnit: 1,
        withheld: 2,
        goto: "global_fund",
      },
    ],
  },
  {
    portfolioId: "pension",
    style: "received",
    density: "compact",
    distributions: [
      {
        id: "feb_distribution",
        assetId: "bond_fund",
        entitledAt: "2026-02-01T00:00:00Z",
        payOn: "2026-02-12",
        perUnit: 0.75,
        receivedAt: "2026-02-12T08:00:00Z",
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Dividends");
export const probes = [
  choose(
    "Track per-unit cash distributions from my investments. Show the entitlement and pay dates, withholding, and let me record when the payout arrives.",
  ),
  choose(
    "Show a dated history of past club meetings in order, with just date and event name, no money or actions.",
    "Timeline",
  ),
  write(
    "Record a pending distribution for portfolio education, id mar_distribution, asset global_fund, entitled at 2026-03-01T00:00:00Z, due 2026-03-10, with 1 per unit and 2 withheld. It hasn't arrived yet.",
  ),
  read("Record receipt of the distribution, not navigation to the fund.", {
    address: "d1/r1/receive",
    action: "press",
  }),
] satisfies c.Probe[];

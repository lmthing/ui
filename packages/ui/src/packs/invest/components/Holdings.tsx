import { z } from "zod";
import * as c from "../../../catalog";
import { dateTime, distinct, recordId, seedAssets, seedPortfolio, seedTime } from "../seeds";

// Core first: List/value can show one value per row, not owned units, cost and valued positions together.
export const meta = {
  id: "Holdings",
  status: "draft",
  group: "data",
  purpose: "See the investments I own, their units, current value and unrealised gain.",
  pick: "Owned investment positions with units, cost basis, dated quotes and unrealised gain. Not account balances (AccountCard), plain rows (List), things in storage (Things), or unowned investments (Watchlist).",
  writeHints: [
    "Use short snake_case record ids and ISO datetimes with offsets. Write opening units and unit cost, not computed value or gain. Zero opening units register an instrument for later activity.",
    'A single-position filter uses an assetId from the portfolio. To show just units and value rather than the cost, quote and gain details, set detail to "brief"; retain the seed data.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "An on-device opening statement and later trades use stored dated quotes; live refresh needs a market data service, and missing quotes stay unknown.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["unit_cost", "price", "quoted_at", "gain"] } },
  parts: ["root", "refresh"],
  items: {
    key: "positions",
    parts: ["root", "name", "symbol", "units", "unit_cost", "price", "quoted_at", "value", "gain"],
    visibleWhen: { visible: true },
  },
  partTiers: { refresh: "service" },
  states: ["filled", "empty", "loading", "error"],
  actions: {
    parts: { refresh: ["press"] },
    items: { root: ["press"] },
    when: { root: { linked: true }, refresh: { quote_service: true } },
  },
} as const satisfies c.Meta;

const position = z.strictObject({
  assetId: recordId,
  name: c.text(32),
  symbol: c.text(12),
  class: z.enum(["equity", "bond", "fund", "crypto", "other"]),
  units: z.number().nonnegative(),
  unitCost: z.number().nonnegative(),
  price: z.number().nonnegative(),
  quotedAt: dateTime,
  goto: c.screenId.optional(),
});

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    portfolioId: recordId,
    asOf: dateTime,
    positions: z.array(position).min(0).max(6),
    assetId: recordId.optional(),
  })
  .refine(({ positions }) => distinct(positions, ({ assetId }) => assetId), { path: ["positions"] })
  .overwrite((input) => ({
    ...input,
    positions: input.positions.map((row) => ({
      ...row,
      visible: row.units > 0 && (!input.assetId || input.assetId === row.assetId),
      linked: Boolean(row.goto),
    })),
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    portfolioId: seedPortfolio(input),
    asOf: seedTime,
    positions: seedAssets(input, 3).map((asset) => ({
      ...asset,
      class: "other",
      units: 0,
      unitCost: 0,
      price: 0,
      quotedAt: seedTime,
    })),
  };
}

export const examples = [
  {
    portfolioId: "education",
    asOf: "2026-01-01T00:00:00Z",
    positions: [
      {
        assetId: "global_fund",
        name: "Global Equity Fund",
        symbol: "GEF",
        class: "fund",
        units: 10,
        unitCost: 80,
        price: 90,
        quotedAt: "2026-03-01T16:00:00Z",
        goto: "global_fund",
      },
      {
        assetId: "income_fund",
        name: "Income Fund",
        symbol: "IFD",
        class: "fund",
        units: 0,
        unitCost: 0,
        price: 55,
        quotedAt: "2026-03-01T16:00:00Z",
      },
    ],
  },
  {
    portfolioId: "pension",
    asOf: "2026-02-01T00:00:00+01:00",
    assetId: "bond_fund",
    density: "compact",
    detail: "brief",
    positions: [
      {
        assetId: "bond_fund",
        name: "Short Bond Fund",
        symbol: "SBF",
        class: "bond",
        units: 4.5,
        unitCost: 22,
        price: 23,
        quotedAt: "2026-02-12T16:00:00+01:00",
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Holdings");
const brief =
  "Use portfolio id education, opening at 2026-01-01T00:00:00Z. I owned 10 Global Equity Fund units (global_fund, GEF, fund) at a unit cost of 80, quoted 90 at 2026-03-01T16:00:00Z.";
export const probes = [
  choose(
    "Show the funds I actually own, with units, what I paid per unit, dated prices and my unrealised gain on each.",
  ),
  choose(
    "Show three saved fund names as plain tappable rows. Just their names and links, no prices or units.",
    "List",
  ),
  write(brief),
  {
    ...write(
      `${brief} Show only units and value beside the name; hide cost, quote details and gain but keep their seed data.`,
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the Global Equity Fund position.", { address: "h1/r1", action: "press" }),
] satisfies c.Probe[];

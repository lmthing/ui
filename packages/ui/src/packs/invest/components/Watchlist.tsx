import { z } from "zod";
import * as c from "../../../catalog";
import { dateTime, distinct, recordId, seedAssets, seedTime } from "../seeds";

// Core first: List/value shows saved names and values, not dated prices against watch thresholds.
export const meta = {
  id: "Watchlist",
  status: "draft",
  group: "data",
  purpose: "Follow dated investment quotes and see how far they are from my watch thresholds.",
  pick: "Investment quotes compared with personal price thresholds, with no trade or ownership implied. Not owned positions (Holdings), plain saved names (List), or physical things to buy (Wishlist).",
  writeHints: [
    "Write a dated quote for each item. Provide direction only when there is a target; the target and direction are stored preferences, not a trade. Do not write a computed gap or threshold status.",
    'Default detail is "brief" (quotes). Use detail "full" when asked to show targets and signed gaps beside the quotes.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "On-device watch records and dated quotes are independent of owned positions and shared quote history, and a live feed is optional.",
  variants: { density: ["comfortable", "compact"], detail: ["brief", "full"] },
  variantParts: { "detail.full": { adds: ["target", "gap"] } },
  parts: ["root", "refresh"],
  items: { key: "items", parts: ["root", "name", "symbol", "price", "quoted_at", "target", "gap", "remove"] },
  confirmParts: ["remove"],
  partTiers: { refresh: "service" },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    parts: { refresh: ["press"] },
    items: { root: ["press"], remove: ["press"] },
    when: { root: { linked: true }, refresh: { quote_service: true } },
    noGoto: { items: ["remove"] },
  },
} as const satisfies c.Meta;

const item = z
  .strictObject({
    assetId: recordId,
    name: c.text(32),
    symbol: c.text(12),
    price: z.number().nonnegative(),
    quotedAt: dateTime.meta({ kind: "text" }),
    target: z.number().positive().optional(),
    direction: z.enum(["at_or_below", "at_or_above"]).optional(),
    goto: c.screenId.optional(),
  })
  .refine(({ target, direction }) => direction === undefined || target !== undefined, {
    path: ["direction"],
  });

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    items: z.array(item).min(1).max(6),
  })
  .refine(({ items }) => distinct(items, ({ assetId }) => assetId), { path: ["items"] })
  .overwrite((input) => ({
    ...input,
    items: input.items.map((row) => ({
      ...row,
      linked: Boolean(row.goto),
      direction: row.target === undefined ? undefined : (row.direction ?? "at_or_below"),
    })),
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return { items: seedAssets(input, 3).map((asset) => ({ ...asset, price: 0, quotedAt: seedTime })) };
}

export const examples = [
  {
    items: [
      {
        assetId: "income_fund",
        name: "Income Fund",
        symbol: "IFD",
        price: 55,
        quotedAt: "2026-03-01T16:00:00Z",
        goto: "income_fund",
      },
    ],
  },
  {
    detail: "full",
    density: "compact",
    items: [
      {
        assetId: "short_bonds",
        name: "Short Bond Fund",
        symbol: "SBF",
        price: 55,
        quotedAt: "2026-03-01T16:00:00Z",
        target: 50,
      },
      {
        assetId: "north_equity",
        name: "North Equity Fund",
        symbol: "NEF",
        price: 77,
        quotedAt: "2026-03-01T16:00:00Z",
        target: 75,
        direction: "at_or_above",
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Watchlist");
const brief =
  "I am watching Income Fund (income_fund, IFD), not owning it. It was quoted at 55 on 2026-03-01T16:00:00Z. I want to watch for a price of 50 or less.";
export const probes = [
  choose(
    "Compare the dated quotes of several stocks I'm watching against my own price thresholds and show the gaps. I don't own the stocks.",
  ),
  choose("Keep a simple list of three tappable favourite fund names, with no quotes or thresholds.", "List"),
  write(brief),
  {
    ...write(`${brief} Show the threshold and signed gap beside the quote.`),
    variant: { axis: "detail", value: "full" },
  },
  read("Remove Income Fund from the watched names, rather than opening it.", {
    address: "w1/r1/remove",
    action: "press",
  }),
] satisfies c.Probe[];

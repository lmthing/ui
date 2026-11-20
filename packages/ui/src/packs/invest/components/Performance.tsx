import { z } from "zod";
import * as c from "../../../catalog";
import { dateTime, distinct, recordId, seedAssets, seedPortfolio, seedTime } from "../seeds";

// Core first: Sparkline/full shows a single trend, not portfolio value and net money invested together.
const ranges = ["all", "month", "year"] as const;
export const meta = {
  id: "Performance",
  status: "draft",
  group: "data",
  purpose: "Separate changes in portfolio value from the money I put in or took out.",
  pick: "Compare portfolio value with net external contributions as two labelled lines over time, with latest money gain or loss. Not one market price (PriceChart), one small trend (Sparkline), or a generic series (LineChart).",
  writeHints: [
    "Write 2–60 dated quote observations in increasing time order, with at most one quote per asset in each sample. Missing quotes are omitted, never written as zero; do not write portfolio values, contributions, gains or rates.",
    "Use ISO datetimes with offsets. Range filters the displayed points, not the contribution baseline.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "The device replays the opening statement, trades, cash flows and receipts for each observation, valuing positions from stored quotes without a market service.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root", "title", "range", "legend", "value", "contributed", "gain"],
  items: { key: "samples", parts: ["root", "at", "value", "contributed", "gain"] },
  states: ["filled", "empty", "loading", "error"],
  actions: { parts: { range: ["select"] }, items: { root: ["select"] } },
  selections: { range: { prop: "range", choices: ranges } },
  select: { prop: "selected_point", value: { field: "at" } },
} as const satisfies c.Meta;

const quote = z.strictObject({ assetId: recordId, price: z.number().nonnegative() });
const sample = z
  .strictObject({ at: dateTime, quotes: z.array(quote).min(0).max(12) })
  .refine(({ quotes }) => distinct(quotes, ({ assetId }) => assetId), { path: ["quotes"] });
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    portfolioId: recordId,
    title: c.text(32),
    samples: z.array(sample).min(2).max(60),
    range: z.enum(ranges).default("all"),
  })
  .refine(
    ({ samples }) =>
      samples.every(({ at }, index) => index === 0 || Date.parse(samples[index - 1]!.at) < Date.parse(at)),
    { path: ["samples"], message: "Use unique observations in chronological order" },
  );

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    portfolioId: seedPortfolio(input),
    title: seedAssets(input, 1)[0]!.name,
    samples: [
      { at: seedTime, quotes: [] },
      { at: "2026-01-02T00:00:00Z", quotes: [] },
    ],
  };
}

export const examples = [
  {
    portfolioId: "education",
    title: "Education portfolio",
    samples: [
      { at: "2026-01-01T00:00:00Z", quotes: [] },
      { at: "2026-03-01T16:00:00Z", quotes: [{ assetId: "global_fund", price: 90 }] },
    ],
  },
  {
    portfolioId: "pension",
    title: "Pension performance",
    range: "year",
    density: "compact",
    samples: [
      { at: "2026-02-01T00:00:00+01:00", quotes: [{ assetId: "bond_fund", price: 22 }] },
      { at: "2026-02-12T16:00:00+01:00", quotes: [{ assetId: "bond_fund", price: 23 }] },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Performance");
export const probes = [
  choose(
    "Plot my total portfolio value against net money I have contributed as two lines on the same dates, showing the difference as profit or loss.",
  ),
  choose(
    "Show just the latest soil moisture reading with a tiny line of recent readings, without axes or a second series.",
    "Sparkline",
  ),
  write(
    "Title it Education portfolio, id education, all time. The opening observation on 2026-01-01T00:00:00Z has no owned assets or quotes. At 2026-03-01T16:00:00Z the global_fund quote is 90. Use the quotes, not guessed totals.",
  ),
  read("Select the observation dated 2026-03-01 at 16:00 UTC.", { address: "p1/r2", action: "select" }),
] satisfies c.Probe[];

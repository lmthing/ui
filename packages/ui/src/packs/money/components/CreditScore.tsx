import { z } from "zod";
import * as c from "../../../catalog";
import { prompt } from "../../../entry/prompt-CreditScore.generated";

// Core first: Progress/ring shows progress to one goal, not a bureau score with rating bands and contributing factors.
const score = z.number().int().min(300).max(850);

export const meta = {
  id: "CreditScore",
  status: "draft",
  group: "data",
  ...prompt,
  region: "body",
  weight: 2,
  tier: "service",
  realPath: "A credit-monitoring service fetches the bureau score and rated factors for the person.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["gauge"] } },
  parts: ["root", "score", "gauge", "tier", "delta", "report", "status", "refresh", "refresh_label"],
  items: { key: "factors", parts: ["root", "label", "value", "rating", "impact"] },
  states: ["filled", "empty", "loading", "error"],
  actions: { items: { root: ["press"] }, parts: { refresh: ["press"] }, when: { root: { linked: true } } },
  emptyActions: ["refresh.press"],
} as const satisfies c.Meta;

const factor = z
  .strictObject({
    label: c.text(24),
    value: c.text(16),
    rating: z.enum(["excellent", "good", "fair", "poor"]),
    impact: z.enum(["high", "medium", "low"]),
    goto: c.screenId.optional(),
  })
  .overwrite((input) => ({ ...input, linked: Boolean(input.goto) }));

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  score,
  previousScore: score.optional(),
  bureau: c.text(24),
  updatedAt: c.isoDate,
  factors: z.array(factor).min(4).max(6),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const [bureau, ...items] = c.itemsOf(cast, 5);
  const thing = c.thingOf(cast);
  return {
    score: 300,
    bureau: (bureau && c.titleOf(bureau, 24, thing)) || c.placeholderTitle(0, lang),
    updatedAt: new Date(0).toISOString().slice(0, 10),
    factors: Array.from({ length: 4 }, (_, index) => {
      const item = items[index];
      return {
        label: (item && c.titleOf(item, 24, thing)) || c.placeholderTitle(index + 1, lang),
        value: c.wordsFor(lang).placeholderValue,
        rating: "fair",
        impact: "low",
      };
    }),
  };
}

// prettier-ignore
const ledgeFactors = [
  { label: "Payment history", value: "All on time", rating: "excellent", impact: "high", goto: "payments" },
  { label: "Credit utilization", value: "18%", rating: "good", impact: "high" },
  { label: "Credit age", value: "5 years", rating: "good", impact: "medium" },
  { label: "Recent inquiries", value: "1 inquiry", rating: "good", impact: "low" },
  { label: "Credit mix", value: "2 account types", rating: "fair", impact: "low" },
] satisfies z.input<typeof factor>[];

export const examples = [
  {
    score: 742,
    previousScore: 724,
    bureau: "Ledge credit report",
    updatedAt: "2026-11-19",
    factors: ledgeFactors,
  },
  {
    score: 694,
    bureau: "Trot credit report",
    updatedAt: "2026-11-17",
    detail: "brief",
    factors: [
      { label: "Payment history", value: "1 late payment", rating: "fair", impact: "high" },
      { label: "Credit utilization", value: "42%", rating: "fair", impact: "high" },
      { label: "Credit age", value: "3 years", rating: "fair", impact: "medium" },
      { label: "Recent inquiries", value: "No inquiries", rating: "excellent", impact: "low" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("CreditScore");
export const probes = [
  choose(
    "Show my latest bureau score on the 300 to 850 scale and explain how my borrowing and payment history affect it.",
  ),
  choose(
    "Show how far I am toward one savings goal with a circular indicator and the amount in the middle.",
    "Progress",
  ),
  write(
    "My bureau report dated 2026-11-19 is 742, up from 724. Rate payment history excellent, utilization and credit age good, inquiries good, and credit mix fair.",
  ),
  {
    ...write(
      "Give a brief bureau report with score 742 on 2026-11-19 and rated payment history, utilization, credit age and inquiries. Keep the score and factors but hide the band gauge.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the payment history breakdown.", { address: "c1/r1", action: "press" }),
] satisfies c.Probe[];

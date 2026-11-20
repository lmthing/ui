import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Bars/compare can plot supplied values but cannot derive with-and-without comparisons from journal entries.
export const meta = {
  id: "Patterns",
  status: "draft",
  group: "data",
  purpose: "Find which logged daily factors tend to go with better or worse moods.",
  pick: "Derive findings from a mood journal by comparing days with and without a tagged factor after at least two weeks. Choose this for journal-derived comparisons even when findings also use paired bars. Not plotting values the person already supplied (Bars) or a single time trend (Sparkline).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The phone computes the comparison averages and findings from stored entries.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root", "days_left"],
  items: { key: "findings", parts: ["root", "finding", "with", "without"] },
  states: ["filled", "empty"],
  writeHints: [
    "Use factor labels from the same screen's Factors when available. Only choose labels and minDays; never invent findings or write mood averages or bar values.",
  ],
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  factors: z.array(c.text(14)).min(1).max(4),
  minDays: z.int().min(14).max(60).default(14),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const factors = c
    .itemsOf(cast, 4)
    .map((item, index) => c.titleOf(item, 14, thing) ?? c.placeholderTitle(index, lang));
  return { factors: factors.length ? factors : [c.placeholderTitle(0, lang)] };
}

export const examples = [
  { factors: ["Outdoors", "Slept well"], minDays: 14 },
  {
    density: "compact",
    surface: "outlined",
    factors: ["Music", "Long shift", "Early start", "Fresh air"],
    minDays: 28,
  },
] satisfies z.input<typeof props>[];

const { choose, write } = c.probesFor("Patterns");
export const probes = [
  choose(
    "Use my mood journal to find how I tend to feel on days with and without time outdoors, with paired bars after enough days have been logged.",
  ),
  choose(
    "Draw one tiny unlabelled line of my mood values across the past seven days, without comparing any factors.",
    "Sparkline",
  ),
  write(
    "Compare mood on days with and without Outdoors and Slept well. Wait until at least 21 days are logged. The app computes the results.",
  ),
] satisfies c.Probe[];

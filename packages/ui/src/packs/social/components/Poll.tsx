import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Choice/cards stores a personal choice, not a group vote with results.
export const meta = {
  id: "Poll",
  status: "draft",
  group: "input",
  purpose: "Ask a group to vote and see how everyone voted.",
  pick: "A shared question with voting options and group results. Not a choice for oneself (Choice), a quiz with right answers (Quiz), or coordinating a date via availability (FindDate).",
  writeHints: [
    "voted is a zero-based index, omitted until the person votes. Write each option's vote count; total and shares are derived. closes uses YYYY-MM-DD.",
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "Votes counted in a shared app.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    emphasis: ["normal", "quiet"],
  },
  parts: ["root", "question", "total", "closes"],
  items: { key: "options", parts: ["root", "label", "share", "selected"] },
  states: ["filled", "success"],
  readSuccess: true,
  actions: { items: { root: ["select"] }, when: { root: { can_vote: true } } },
  select: { prop: "voted", value: "index" },
  live: { derive: pollResult },
  read: (input, state, lang): string[] => {
    const { options, voted, closes } = input as z.output<typeof props>;
    if (voted === undefined && state !== "success") return [];
    const total = options.reduce((sum, { votes }) => sum + votes, 0);
    return [
      c.totalLine(total, undefined, lang),
      ...(voted === undefined ? [] : [c.wordsFor(lang).chosen(options[voted]!.label)]),
      ...options.map(({ label, votes }) => `${label} · ${c.percentLine(votes, total, lang)}`),
      ...(closes ? [c.appointmentDate(closes, lang)] : []),
    ];
  },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    question: c.text(80),
    options: z
      .array(z.strictObject({ label: c.text(32), votes: z.int().min(0).max(999999) }))
      .min(2)
      .max(5),
    voted: z.int().min(0).max(4).optional(),
    closes: c.isoDate.optional(),
  })
  .refine(({ voted, options }) => voted === undefined || voted < options.length, { path: ["voted"] })
  .overwrite((value) => ({ ...value, seed_has_vote: value.voted !== undefined }));

function pollResult(input: c.Values): c.Values {
  const { voted, options } = input as z.output<typeof props>;
  if (voted === undefined) return { can_vote: true };
  return {
    can_vote: false,
    ...(input.seed_has_vote
      ? {}
      : {
          options: options.map((option, index) =>
            index === voted ? { ...option, votes: option.votes + 1 } : option,
          ),
        }),
  };
}

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  const options = items.flatMap((item) => {
    const label = c.titleOf(item, 32, thing);
    return label ? [{ label, votes: 0 }] : [];
  });
  while (options.length < 2) options.push({ label: c.placeholderTitle(options.length, lang), votes: 0 });
  const first = items[0];
  return { question: (first && c.detailOf(first, 80, thing)) || c.wordsFor(lang).placeholderLabel, options };
}

// prettier-ignore
export const examples = [
  { question: "Which cutting should we swap next?", options: [{ label: "Fern", votes: 4 }, { label: "Basil", votes: 3 }], closes: "2026-11-28" },
  { density: "compact", surface: "outlined", emphasis: "quiet", question: "Where should we start Saturday’s walk?", options: [{ label: "River gate", votes: 6 }, { label: "Park entrance", votes: 2 }], voted: 0 },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Poll");
export const probes = [
  choose(
    "Ask members to vote for a favourite cutting and show the percentage each option receives after voting.",
  ),
  choose(
    "Let me pick the one watering plan I personally want, from two options with an explanation for each. The choice is private and there are no results.",
    "Choice",
  ),
  write(
    "Ask the group whether they prefer a fern or basil swap. Fern has four votes and basil has three; I haven’t voted yet.",
  ),
  read("Vote for Basil.", { address: "p1/r2", action: "select" }),
] satisfies c.Probe[];

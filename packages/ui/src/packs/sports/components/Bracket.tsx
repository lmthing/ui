import { z } from "zod";
import * as c from "../../../catalog";

// Core first: List/lead:number orders entrants, not head-to-head ties and winners advancing across rounds.
export const meta = {
  id: "Bracket",
  status: "draft",
  group: "data",
  purpose: "Follow knockout ties and see who advances to the next round.",
  pick: "A knockout cup showing paired opponents and scores round by round, with winners carried forward. Not one ranked list (List), a league table (Standings), or a sequence of fixtures (Fixtures).",
  writeHints: [
    "Write rounds earliest to latest, and ties in bracket order. Do not write winners or connectors. Later rounds use the team names already known to advance; omit scores for ties not played.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  partTiers: { root: "people" },
  realPath: "The organiser records results on one phone; others follow the cup in a shared app.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root"],
  items: { key: "ties", parts: ["root", "round", "a", "b", "a_score", "b_score"] },
  states: ["filled", "loading"],
  actions: { items: { root: ["press"] } },
  read: (input, _state, lang): string[] => {
    const { ties } = input as z.output<typeof props>;
    const score = (value: number | undefined) => (value === undefined ? "" : ` ${c.numberLine(value, lang)}`);
    return ties.map(
      ({ round, a, b, aScore, bScore }) => `${round}: ${a}${score(aScore)} · ${b}${score(bScore)}`,
    );
  },
} as const satisfies c.Meta;

const score = z.int().nonnegative().optional();
const tie = z.strictObject({ a: c.text(16), b: c.text(16), aScore: score, bScore: score });
const schema = z.strictObject({
  ...c.variantProps(meta.variants),
  rounds: z
    .array(z.strictObject({ label: c.text(16), ties: z.array(tie).min(1).max(8) }))
    .min(1)
    .max(4),
  mine: c.text(16).optional(),
});

// One addressed item per tie, in round-major order, without a second Writer field.
function withTies(input: z.output<typeof schema>) {
  return {
    ...input,
    ties: input.rounds.flatMap(({ label, ties }) => ties.map((row) => ({ ...row, round: label }))),
  };
}
export const props = schema.overwrite(withTies) as typeof schema &
  z.ZodType<ReturnType<typeof withTies>, z.input<typeof schema>>;

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const entrants = c.itemsOf(cast, 2);
  const label = (index: number) =>
    (entrants[index] && c.titleOf(entrants[index], 16, thing)) || c.placeholderTitle(index, lang);
  return { rounds: [{ label: c.placeholderTitle(2, lang), ties: [{ a: label(0), b: label(1) }] }] };
}

export const examples = [
  {
    mine: "Ledge Rovers",
    rounds: [
      {
        label: "Semifinals",
        ties: [
          { a: "Ledge Rovers", b: "Fern House", aScore: 3, bScore: 1 },
          { a: "Garden Crew", b: "Oakfield", aScore: 0, bScore: 2 },
        ],
      },
      { label: "Final", ties: [{ a: "Ledge Rovers", b: "Oakfield" }] },
    ],
  },
  {
    density: "compact",
    surface: "outlined",
    rounds: [{ label: "Final", ties: [{ a: "Trot Town", b: "River Rovers", aScore: 2, bScore: 4 }] }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Bracket");
export const probes = [
  choose(
    "Show our knockout cup with each two-team tie, the score and the winners moving from semifinals to the final.",
  ),
  choose(
    "Rank cup scorers by their total goals, one row per player and one value each; no rounds, pairings or advancement.",
    "List",
  ),
  write(
    "Show the semifinal results Ledge Rovers 3–1 Fern House and Garden Crew 0–2 Oakfield, then the unplayed final Ledge Rovers versus Oakfield. Highlight Ledge Rovers.",
  ),
  read("Open the final tie between Ledge Rovers and Oakfield", { address: "b1/r3", action: "press" }),
] satisfies c.Probe[];

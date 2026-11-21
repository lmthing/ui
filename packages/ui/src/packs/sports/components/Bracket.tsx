import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { bracketDrawing, bracketReading } from "../copy";
import { sportsWordsFor } from "../lang";

// Core first: List/lead:number orders entrants, not head-to-head ties and winners advancing across rounds.
export const meta = {
  id: "Bracket",
  status: "ready",
  group: "data",
  purpose: "Follow knockout ties and see who advances to the next round.",
  pick: "A knockout cup as paired teams per round, with winners advancing. Only use it for actual head-to-head ties; a top-scorers ranking is List, even in a cup. Not a league table (Standings) or a sequence of matches (Fixtures).",
  writeHints: [
    "Write rounds earliest to latest, and ties in bracket order. Do not write winners or connectors. Later rounds use the team names already known to advance; omit scores for ties not played.",
    'For team names and winner markers without printed scores, write "detail":"brief" and keep the known scores in data. Otherwise write "detail":null. Always write "density":null and "surface":null unless the person specifically requests a change to spacing or the card treatment.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  partTiers: { root: "people" },
  realPath: "The organiser records results on one phone; others follow the cup in a shared app.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["a_score", "b_score"] } },
  parts: ["root", "title", "bracket"],
  items: { key: "ties", parts: ["root", "round", "a", "b", "a_score", "b_score"] },
  states: ["filled", "loading"],
  actions: { items: { root: ["press"] } },
  emptyActions: [],
  read: (input, _state, lang): string[] => [
    sportsWordsFor(lang).bracket.title,
    ...bracketReading(input as BracketProps, lang),
  ],
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
  {
    ...write(
      "Show the cup final, Trot Town 2 to River Rovers 4. Keep the result so you can mark the winner, but show the team names and winner marker without printing the score numbers.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the final tie between Ledge Rovers and Oakfield", { address: "b1/r3", action: "press" }),
] satisfies c.Probe[];

type BracketProps = c.Props<typeof props, typeof meta>;

export function Bracket(input: BracketProps) {
  const { lang, words } = kit.useWords(sportsWordsFor);
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      {state === "loading" ? (
        <kit.KitSkeleton
          shape="figure"
          inset="none"
          density={density}
          emphasis="quiet"
          content={[["heading", words.bracket.title]]}
        />
      ) : (
        <kit.KitText part="title" role="heading" emphasis="quiet" tone="muted" density={density}>
          {words.bracket.title}
        </kit.KitText>
      )}
      <kit.KitBracket
        part="bracket"
        loading={state === "loading"}
        {...bracketDrawing({ ...input, detail }, lang)}
      />
    </kit.KitCard>
  );
}

import { z } from "zod";
import * as c from "../../../catalog";
import { communityWordsFor } from "../lang";
import { distinct, ref } from "../seeds";

export const motionChoices = ["for", "against", "abstain"] as const;
const motionChoice = z.enum(motionChoices);
export const voteRule = z.enum(["majority", "two_thirds", "unanimous"]);
export const voteCandidate = z.strictObject({ id: ref, name: c.text(24) });
export const voteBallot = z.strictObject({
  memberId: ref,
  choice: z.union([motionChoice, z.array(ref).min(1).max(5)]),
});

type Ballot = z.output<typeof voteBallot>;
type Candidate = z.output<typeof voteCandidate> & { candidateId?: string };
type Rule = z.output<typeof voteRule>;
export type ElectionSeed = {
  style: "ballot" | "motion" | "result" | "election";
  candidates?: Candidate[] | undefined;
  seats?: number | undefined;
  ballots: Ballot[];
};

export function validVoteShape({ style, candidates, seats, ballots }: ElectionSeed) {
  if (!distinct(ballots, (row) => row.memberId)) return false;
  if (style !== "election")
    return !candidates && seats === undefined && ballots.every(({ choice }) => !Array.isArray(choice));
  if (!candidates || (seats ?? 1) > candidates.length || !distinct(candidates, (row) => row.id)) return false;
  const ids = new Set(candidates.map((row) => row.candidateId ?? row.id));
  return ballots.every(
    ({ choice }) =>
      choice === "abstain" ||
      (Array.isArray(choice) &&
        choice.length <= (seats ?? 1) &&
        distinct(choice, (id) => id) &&
        choice.every((id) => ids.has(id))),
  );
}

function elect(tallies: number[], seats: number, cast: number, rule: Rule) {
  const meetsRule = (count: number) =>
    count > 0 &&
    (rule === "majority" ? count * 2 > cast : rule === "two_thirds" ? count * 3 >= cast * 2 : count === cast);
  const qualified = tallies.filter(meetsRule).sort((a, b) => b - a);
  const cutoff = qualified[seats - 1];
  const tied = cutoff !== undefined && cutoff === qualified[seats];
  return {
    tied,
    elected: tallies.map(
      (count) => meetsRule(count) && (!tied || count > cutoff) && (cutoff === undefined || count >= cutoff),
    ),
  };
}

export function electionFacts(
  seed: ElectionSeed,
  rule: Rule,
  own: Ballot["choice"] | undefined,
  closed: boolean,
  reached: boolean,
) {
  const { candidates = [], ballots } = seed,
    seats = seed.seats ?? 1;
  const cast = ballots.filter(({ choice }) => Array.isArray(choice));
  const counts = candidates.map(
    ({ id, candidateId }) => cast.filter(({ choice }) => choice.includes(candidateId ?? id)).length,
  );
  const result = closed && reached ? elect(counts, seats, cast.length, rule) : undefined;
  const selected = Array.isArray(own) ? own : [];
  return {
    seats,
    tied: result?.tied ?? false,
    abstained: own === "abstain",
    electionRows: candidates.map(({ id, name, candidateId }, index) => ({
      id,
      name,
      count: closed ? counts[index]! : undefined,
      elected: result?.elected[index] ?? false,
      selected: selected.includes(candidateId ?? id),
      can_select: selected.length < seats || selected.includes(candidateId ?? id),
    })),
  };
}

export function electionCopy(election: ReturnType<typeof electionFacts>, lang?: string) {
  const w = communityWordsFor(lang).vote;
  const { electionRows, seats, tied, abstained } = election;
  const selected = electionRows.filter((row) => row.selected).map((row) => row.name);
  const own = abstained ? w.choice.abstain : new Intl.ListFormat(c.localeOf(lang)).format(selected);
  return {
    seats: w.seats(c.numberLine(seats, lang), c.pluralForm(seats, lang)),
    result: tied ? w.tied : electionRows.some((row) => row.elected) ? w.results : w.noSeats,
    own,
    rows: electionRows.map((row) => ({
      ...row,
      countText: row.count === undefined ? undefined : c.numberLine(row.count, lang),
    })),
  };
}

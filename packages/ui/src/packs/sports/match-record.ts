import { z } from "zod";
import { text } from "../../catalog";

export const matchRecordKind = "match_records";
export const goalSide = z.enum(["home", "away"]);
export const maxMatchMinute = 130;
export const matchMinute = z.int().min(0).max(maxMatchMinute);
export const maxSeedEvents = 12;
export const matchEvent = z.strictObject({
  minute: matchMinute,
  side: goalSide,
  kind: z.enum(["goal", "card_yellow", "card_red", "sub", "note"]),
  text: text(36),
});
export const goalEvents = z.array(matchEvent).min(1).max(maxSeedEvents);
const goalId = z.int().positive();
const goal = z.strictObject({
  id: goalId,
  side: goalSide,
  minute: matchMinute,
  scorer: text(36).nullable(),
  description: text(36).optional(),
});
export const matchRecord = z.strictObject({ matchId: z.string().min(1), goals: z.array(goal) });
const tally = z.int().nonnegative();
export const scoreSeed = z.object({ homeScore: tally, awayScore: tally });
const addressedGoal = goal.extend({ seedOccurrence: goalId.optional() });
const unlistedGoal = z.strictObject({ side: goalSide, seed: tally, remaining: tally });
const operation = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("add"), goal }),
  z.strictObject({ kind: z.literal("undo"), target: z.union([addressedGoal, unlistedGoal]) }),
]);
type Goal = z.output<typeof addressedGoal>;
export type MatchGoal = Goal & { local?: true };
type Score = z.output<typeof scoreSeed>;
export type MatchRecord = { matchId: string; goals: readonly Goal[] } & {
  /** Legacy boards without a feed know the score, but not the individual goals. */
  unlisted?: Score;
};
const emptyScore: Score = { homeScore: 0, awayScore: 0 };

export function seededMatch(matchId: string, events: readonly z.output<typeof matchEvent>[]): MatchRecord {
  const occurrences = new Map<string, number>();
  const goals = events
    .filter(({ kind }) => kind === "goal")
    .reverse()
    .map(({ side, minute, text }, i) => {
      const key = JSON.stringify([side, minute, text]);
      const seedOccurrence = (occurrences.get(key) ?? 0) + 1;
      occurrences.set(key, seedOccurrence);
      return { id: i + 1, side, minute, scorer: null, description: text, seedOccurrence };
    });
  return { matchId, goals };
}

function sameGoal(left: Goal | undefined, right: Goal) {
  return (
    left?.side === right.side &&
    left.minute === right.minute &&
    left.scorer === right.scorer &&
    left.description === right.description
  );
}

const seedKey = ({ side, minute, description, seedOccurrence }: Goal) =>
  JSON.stringify([side, minute, description, seedOccurrence]);
const recordKey = (goal: Goal) => (goal.seedOccurrence ? seedKey(goal) : `host:${goal.id}`);
const localKey = (goal: Goal) => `local:${goal.id}`;

function removeGoal(goals: Map<string, MatchGoal>, target: Goal) {
  const key = [localKey(target), recordKey(target)].find(
    (key) => sameGoal(goals.get(key), target) && goals.get(key)?.seedOccurrence === target.seedOccurrence,
  );
  return key !== undefined && goals.delete(key);
}

/** Fold confirmed changes onto the current baseline without confusing collisions with acknowledgments. */
export function replayMatch(record: MatchRecord, journal: readonly unknown[]) {
  const baseline = [...record.goals].sort((a, b) => a.id - b.id);
  const goals = new Map<string, MatchGoal>(baseline.map((goal) => [recordKey(goal), goal]));
  if (goals.size !== record.goals.length) return;
  const unlisted = record.unlisted;
  const activeUnlisted = record.unlisted ? { ...record.unlisted } : undefined;
  const total = matchScore(record.goals, activeUnlisted);
  let highestId = record.goals.reduce((highest, { id }) => Math.max(highest, id), 0);
  let lastAdded = 0;
  for (const entry of journal) {
    const op = operation.safeParse(entry);
    if (!op.success) return;
    if (op.data.kind === "undo") {
      const { target } = op.data;
      const key = `${target.side}Score` as const;
      if ("id" in target) {
        if (removeGoal(goals, target)) total[key]--;
      } else if (activeUnlisted) {
        if (
          target.remaining > 0 &&
          unlisted?.[key] === target.seed &&
          activeUnlisted[key] === target.remaining
        ) {
          activeUnlisted[key]--;
          total[key]--;
        }
      }
    } else {
      const { goal } = op.data;
      if (goal.id <= lastAdded) return;
      lastAdded = goal.id;
      highestId = Math.max(highestId, goal.id);
      const key = `${goal.side}Score` as const;
      // Exact host echoes retain the local row identity without counting the goal twice.
      if (sameGoal(goals.get(recordKey(goal)), goal)) goals.delete(recordKey(goal));
      else if (total[key] < Number.MAX_SAFE_INTEGER) total[key]++;
      else continue;
      goals.set(localKey(goal), { ...goal, local: true });
    }
  }
  return {
    goals: [...goals.values()],
    nextId: highestId < Number.MAX_SAFE_INTEGER ? highestId + 1 : undefined,
    ...(activeUnlisted && { unlisted: activeUnlisted, seed: record.unlisted }),
  };
}

export function goalRowId({ id, local, seedOccurrence }: MatchGoal) {
  const namespace = local ? 2n : seedOccurrence ? 0n : 1n;
  return `r${BigInt(maxSeedEvents) + 3n * BigInt(id) + namespace}`;
}

export function matchScore(goals: readonly Goal[], unlisted: Score = emptyScore) {
  const score = { ...unlisted };
  for (const { side } of goals) {
    if (side === "home") score.homeScore++;
    else score.awayScore++;
  }
  return score;
}

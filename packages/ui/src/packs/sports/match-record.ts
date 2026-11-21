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
const unlistedGoal = z.strictObject({ side: goalSide, seed: tally, remaining: tally });
const operation = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("add"), goal }),
  z.strictObject({ kind: z.literal("undo"), target: z.union([goal, unlistedGoal]) }),
]);
export type Goal = z.output<typeof goal>;
type Score = z.output<typeof scoreSeed>;
export type MatchRecord = z.output<typeof matchRecord> & {
  /** Legacy boards without a feed know the score, but not the individual goals. */
  unlisted?: Score;
};
const emptyScore: Score = { homeScore: 0, awayScore: 0 };

export function seededMatch(matchId: string, events: readonly z.output<typeof matchEvent>[]): MatchRecord {
  return {
    matchId,
    goals: [...events]
      .reverse()
      .flatMap(({ side, kind, minute, text }, index) =>
        kind === "goal" ? [{ id: index + 1, side, minute, scorer: null, description: text }] : [],
      ),
  };
}

function sameGoal(left: Goal | undefined, right: Goal) {
  return (
    left?.side === right.side &&
    left.minute === right.minute &&
    left.scorer === right.scorer &&
    left.description === right.description
  );
}

/** Already-applied changes are no-ops on a refreshed baseline. Conflicts leave the baseline goal intact. */
export function replayMatch(record: MatchRecord, journal: readonly unknown[]) {
  const goals = new Map(record.goals.map((goal) => [goal.id, goal]));
  if (goals.size !== record.goals.length) return;
  const unlisted = record.unlisted;
  const activeUnlisted = record.unlisted ? { ...record.unlisted } : undefined;
  let highestId = record.goals.reduce((highest, { id }) => Math.max(highest, id), 0);
  let lastAdded = 0;
  for (const entry of journal) {
    const op = operation.safeParse(entry);
    if (!op.success) return;
    if (op.data.kind === "undo") {
      const { target } = op.data;
      if ("id" in target) {
        if (sameGoal(goals.get(target.id), target)) goals.delete(target.id);
      } else if (activeUnlisted) {
        const key = `${target.side}Score` as const;
        if (
          target.remaining > 0 &&
          unlisted?.[key] === target.seed &&
          activeUnlisted[key] === target.remaining
        )
          activeUnlisted[key]--;
      }
    } else {
      const { goal } = op.data;
      if (goal.id <= lastAdded) return;
      lastAdded = goal.id;
      highestId = Math.max(highestId, goal.id);
      if (!goals.has(goal.id)) goals.set(goal.id, goal);
    }
  }
  return {
    goals: [...goals.values()].sort((a, b) => a.id - b.id),
    nextId: highestId < Number.MAX_SAFE_INTEGER ? highestId + 1 : undefined,
    ...(activeUnlisted && { unlisted: activeUnlisted, seed: record.unlisted }),
  };
}

export function matchScore(goals: readonly Goal[], unlisted: Score = emptyScore) {
  const score = { ...unlisted };
  for (const { side } of goals) {
    if (side === "home") score.homeScore++;
    else score.awayScore++;
  }
  return score;
}

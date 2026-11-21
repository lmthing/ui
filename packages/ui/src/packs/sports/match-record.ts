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
const operation = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("add"), goal }),
  z.strictObject({ kind: z.literal("undo"), id: goalId }),
]);
export type Goal = z.output<typeof goal>;
export type MatchRecord = z.output<typeof matchRecord>;

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

/** The journal is append-only; goals can be removed by identity without reusing their IDs. */
export function replayMatch(record: MatchRecord, journal: readonly unknown[]) {
  const goals = new Map(record.goals.map((goal) => [goal.id, goal]));
  if (goals.size !== record.goals.length) return;
  let highestId = record.goals.reduce((highest, { id }) => Math.max(highest, id), 0);
  for (const entry of journal) {
    const op = operation.safeParse(entry);
    if (!op.success) return;
    if (op.data.kind === "undo") {
      if (!goals.delete(op.data.id)) return;
    } else {
      const { goal } = op.data;
      if (goal.id <= highestId) return;
      highestId = goal.id;
      goals.set(goal.id, goal);
    }
  }
  return {
    goals: [...goals.values()],
    nextId: highestId < Number.MAX_SAFE_INTEGER ? highestId + 1 : undefined,
  };
}

export function matchScore(goals: readonly Goal[]) {
  const score = { homeScore: 0, awayScore: 0 };
  for (const { side } of goals) {
    if (side === "home") score.homeScore++;
    else score.awayScore++;
  }
  return score;
}

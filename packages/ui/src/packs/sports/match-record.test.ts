import { expect, it } from "vitest";
import { matchRecord, matchScore, replayMatch, seededMatch } from "./match-record";

const opening = { id: 1, side: "home", minute: 8, scorer: "Reed" } as const;
const equalizer = { id: 2, side: "away", minute: 31, scorer: "Banks" } as const;
const winner = { id: 3, side: "home", minute: 72, scorer: "Woods" } as const;
const record = matchRecord.parse({ matchId: "match", goals: [opening, equalizer] });

it("adds one goal and derives the score without changing the input record", () => {
  const after = replayMatch(record, [{ kind: "add", goal: winner }])!;
  expect(after.goals).toEqual([opening, equalizer, winner]);
  expect(matchScore(after.goals)).toEqual({ homeScore: 2, awayScore: 1 });
  expect(record.goals).toEqual([opening, equalizer]);
});

it("undoes a named earlier goal without removing the latest goal or reusing an ID", () => {
  const after = replayMatch(record, [
    { kind: "add", goal: winner },
    { kind: "undo", id: opening.id },
    { kind: "undo", id: winner.id },
  ]);
  expect(after).toEqual({ goals: [equalizer], nextId: 4 });
  expect(matchScore(after!.goals)).toEqual({ homeScore: 0, awayScore: 1 });
});

it("rejects ambiguous IDs, invalid goals, unknown removals and ID reuse", () => {
  expect(replayMatch({ ...record, goals: [opening, opening] }, [])).toBeUndefined();
  expect(replayMatch(record, [{ kind: "undo", id: 9 }])).toBeUndefined();
  expect(replayMatch(record, [{ kind: "add", goal: { ...winner, minute: 131 } }])).toBeUndefined();
  expect(
    replayMatch(record, [
      { kind: "undo", id: 2 },
      { kind: "add", goal: equalizer },
    ]),
  ).toBeUndefined();
});

it("takes only goal incidents from the wire and keeps their descriptions without guessing a scorer", () => {
  const seeded = seededMatch("match", [
    { kind: "goal", side: "away", minute: 32, text: "Rivers heads in" },
    { kind: "note", side: "home", minute: 1, text: "Kickoff" },
  ]);
  expect(seeded.goals).toEqual([
    { id: 2, side: "away", minute: 32, scorer: null, description: "Rivers heads in" },
  ]);
});

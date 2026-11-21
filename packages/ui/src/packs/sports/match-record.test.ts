import { expect, it } from "vitest";
import { matchRecord, matchScore, replayMatch, seededMatch } from "./match-record";

const opening = { id: 1, side: "home", minute: 8, scorer: "Reed" } as const;
const equalizer = { id: 2, side: "away", minute: 31, scorer: "Banks" } as const;
const winner = { id: 3, side: "home", minute: 72, scorer: "Woods" } as const;
const record = matchRecord.parse({ matchId: "match", goals: [opening, equalizer] });

it("adds one goal and derives the score without changing the input record", () => {
  const after = replayMatch(record, [{ kind: "add", goal: winner }])!;
  expect(after.goals).toEqual([opening, equalizer, { ...winner, local: true }]);
  expect(matchScore(after.goals)).toEqual({ homeScore: 2, awayScore: 1 });
  expect(record.goals).toEqual([opening, equalizer]);
});

it("undoes a named earlier goal without removing the latest goal or reusing an ID", () => {
  const after = replayMatch(record, [
    { kind: "add", goal: winner },
    { kind: "undo", target: opening },
    { kind: "undo", target: winner },
  ]);
  expect(after).toEqual({ goals: [equalizer], nextId: 4 });
  expect(matchScore(after!.goals)).toEqual({ homeScore: 0, awayScore: 1 });
});

it("rejects ambiguous baselines, malformed goals and reuse of a journal ID", () => {
  expect(replayMatch({ ...record, goals: [opening, opening] }, [])).toBeUndefined();
  expect(replayMatch(record, [{ kind: "undo", target: 9 }])).toBeUndefined();
  expect(replayMatch(record, [{ kind: "add", goal: { ...winner, minute: 131 } }])).toBeUndefined();
  expect(
    replayMatch(record, [
      { kind: "add", goal: winner },
      { kind: "undo", target: winner },
      { kind: "add", goal: winner },
    ]),
  ).toBeUndefined();
});

it("replays acknowledged changes and never removes a different goal with the same ID", () => {
  const replacement = { ...opening, scorer: "Taylor" };
  const refreshed = { ...record, goals: [replacement, winner] };
  const after = replayMatch(refreshed, [
    { kind: "add", goal: winner },
    { kind: "undo", target: opening },
    { kind: "undo", target: equalizer },
  ]);
  expect(after).toEqual({ goals: [replacement, { ...winner, local: true }], nextId: 4 });
});

it("keeps a local add when the refreshed feed and journal use the same numeric ID", () => {
  const baseline = seededMatch("match", [
    { kind: "goal", side: "home", minute: 21, text: "Another home goal" },
    { kind: "goal", side: "home", minute: 8, text: "Opening home goal" },
  ]);
  const after = replayMatch(baseline, [{ kind: "add", goal: equalizer }])!;
  expect(matchScore(after.goals)).toEqual({ homeScore: 2, awayScore: 1 });
  expect(after.goals).toContainEqual({ ...equalizer, local: true });
});

it("does not project an unsafe legacy score after the aggregate seed refreshes", () => {
  const seed = (homeScore: number) => ({
    matchId: "match",
    goals: [],
    unlisted: { homeScore, awayScore: 0 },
  });
  const journal = [{ kind: "add", goal: opening }];
  for (const score of [Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER]) {
    const after = replayMatch(seed(score), journal)!;
    expect(matchScore(after.goals, after.unlisted).homeScore).toBe(Number.MAX_SAFE_INTEGER);
  }
});

it("takes only goal incidents from the wire and keeps their descriptions without guessing a scorer", () => {
  const seeded = seededMatch("match", [
    { kind: "goal", side: "away", minute: 32, text: "Rivers heads in" },
    { kind: "note", side: "home", minute: 1, text: "Kickoff" },
  ]);
  expect(seeded.goals).toEqual([
    { id: 1, side: "away", minute: 32, scorer: null, description: "Rivers heads in", seedOccurrence: 1 },
  ]);
});

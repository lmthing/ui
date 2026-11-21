import { describe, expect, it } from "vitest";
import { components } from "@lmthing/ui/catalog";
import { voteFacts, voteCopy, voteRecordKind } from "../../copy";

const seed = components.Vote.props.parse(components.Vote.examples[0]);
const opens = Date.parse(seed.opens);
const closes = Date.parse(seed.closes);
const votes = (...choices: ("for" | "against" | "abstain")[]) =>
  choices.map((choice, index) => ({ memberId: `m_${index}`, choice }));

describe("Vote projection", () => {
  it.each([
    ["majority", votes("for", "for", "against", "abstain"), 4, "passed"],
    ["majority", votes("for", "against", "abstain"), 3, "failed"],
    ["majority", votes("for", "for", "abstain"), 4, "noQuorum"],
    ["two_thirds", votes("for", "for", "against", "abstain"), 4, "passed"],
    ["two_thirds", votes("for", "against"), 2, "failed"],
    ["unanimous", votes("for", "abstain"), 2, "passed"],
    ["unanimous", votes("for", "for", "against"), 3, "failed"],
    ["unanimous", votes("abstain"), 1, "failed"],
    ["majority", votes(), 1, "noQuorum"],
  ] as const)("applies %s to %j at quorum %i", (rule, ballots, quorum, decision) => {
    const input = { ...seed, rule, ballots, quorum };
    expect(voteFacts(input, {}, closes - 1).decision).toBeUndefined();
    expect(voteFacts(input, {}, closes)).toMatchObject({ participation: ballots.length, decision });
    expect(voteFacts({ ...input, cancelled: true }, {}, closes).decision).toBeUndefined();
  });
});

describe("Vote host records", () => {
  it("keeps host eligibility, permissions and ballots separate from the seed", () => {
    const ballots = votes("against", "for");
    const record = {
      ...seed,
      ballots,
      chair: "m_1",
      viewer: "m_0",
      quorum: 2,
      eligible: ["m_0", "m_1"],
      opens: "2026-11-18T20:00:00Z",
      closes: "2026-11-18T21:00:00Z",
    };
    const show = (now: number, ...rows: unknown[]) => voteFacts(seed, { [voteRecordKind]: rows }, now);
    expect(show(opens, record)).toMatchObject({ phase: "scheduled", can_vote: false, can_cancel: false });
    expect(show(closes, record)).toMatchObject({
      phase: "open",
      can_vote: true,
      can_cancel: false,
      own_ballot: "against",
      participation: 2,
      counts: { for: 1, against: 1, abstain: 0 },
    });
    for (const rows of [
      [],
      [{ ...record, voteId: "elsewhere" }],
      [{ ...record, ballots: [ballots[0], ballots[0]] }],
      [{ ...record, ballots: [...ballots, { memberId: "outside", choice: "for" }] }],
      [record, record],
    ]) {
      expect(show(closes, ...rows)).toMatchObject({
        can_vote: false,
        can_cancel: false,
        own_ballot: undefined,
      });
    }
  });

  it("counts full host records and localizes UTC stamps and numbers", () => {
    const ballots = Array.from({ length: 42 }, (_, i) => ({ memberId: `member_${i}`, choice: "for" }));
    const record = {
      ...seed,
      ballots,
      quorum: 40,
      eligible: ballots.map(({ memberId }) => memberId),
      closes: "2026-11-18T21:00:00+01:00",
    };
    const facts = voteFacts(seed, { [voteRecordKind]: [record] }, closes);
    expect(facts).toMatchObject({ phase: "closed", decision: "passed", participation: 42 });
    expect(voteCopy(facts, "filled")).toMatchObject({ closes: "Closes 18 Nov, 20:00 UTC" });
    expect(voteCopy(facts, "filled", "ar-EG").participation).toBe("٤٢ of ٤٠ cast");
  });
});

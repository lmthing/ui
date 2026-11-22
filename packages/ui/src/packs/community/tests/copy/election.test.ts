import { describe, expect, it } from "vitest";
import { components } from "@lmthing/ui/catalog";
import { voteCopy, voteFacts, voteRecordKind } from "../../copy";

const { props, examples } = components.Vote;
const seed = props.parse(examples[4]);
const closes = Date.parse(seed.closes);
const ballots = [
  { memberId: "a", choice: ["ana", "lee"] },
  { memberId: "b", choice: ["ana", "lee"] },
  { memberId: "c", choice: ["ana", "jo"] },
  { memberId: "d", choice: ["jo"] },
  { memberId: "e", choice: "abstain" as const },
];

describe("election quorum and seat assignment", () => {
  it("counts abstentions toward quorum but not the per-candidate threshold, then keeps winners stable", () => {
    const input = { ...seed, ballots, quorum: 5, rule: "majority" as const };
    const open = voteFacts(input, {}, closes - 1);
    expect(open.participation).toBe(5);
    expect(open.election?.electionRows.every((row) => row.count === undefined && !row.elected)).toBe(true);
    const result = voteFacts(input, {}, closes);
    expect(result.election?.electionRows.map((row) => [row.count, row.elected])).toEqual([
      [3, true],
      [2, false],
      [2, false],
    ]);
    const noQuorum = voteFacts({ ...input, quorum: 6 }, {}, closes);
    expect(noQuorum.election?.electionRows.some((row) => row.elected)).toBe(false);
    expect(voteCopy(noQuorum, "filled").decision).toBe("Quorum not reached");
    expect(
      voteFacts({ ...input, cancelled: true }, {}, closes).election?.electionRows[0]?.count,
    ).toBeUndefined();
  });

  it("does not break a qualifying tie using roster order", () => {
    const tied = [
      { memberId: "a", choice: ["ana", "lee"] },
      { memberId: "b", choice: ["ana", "jo"] },
      { memberId: "c", choice: ["lee", "jo"] },
    ];
    const input = { ...seed, ballots: tied, quorum: 3, rule: "two_thirds" as const };
    expect(voteFacts(input, {}, closes).election).toMatchObject({
      tied: true,
      electionRows: Array.from({ length: 3 }, () => ({ count: 2, elected: false })),
    });
    expect(voteFacts({ ...input, seats: 3 }, {}, closes).election).toMatchObject({
      tied: false,
      electionRows: Array.from({ length: 3 }, () => ({ count: 2, elected: true })),
    });
  });

  it("parses old votes unchanged and rejects incompatible candidate and ballot shapes", () => {
    const input = examples[4]!;
    const old = examples[0]!;
    expect(props.parse(old).style).toBe("ballot");
    expect(props.parse({ ...old, style: "motion" }).ballots).toEqual(old.ballots);
    expect(props.safeParse({ ...input, seats: undefined }).success).toBe(true);
    for (const patch of [
      { seats: 0 },
      { seats: 6 },
      { seats: 4 },
      { candidates: undefined },
      { candidates: [input.candidates?.[0], input.candidates?.[0]] },
      { ballots: [{ memberId: "cal", choice: "for" }] },
      { ballots: [{ memberId: "cal", choice: ["ana", "ana"] }] },
      { ballots: [{ memberId: "cal", choice: ["outside"] }] },
      { ballots: [{ memberId: "cal", choice: ["ana", "lee", "jo"] }] },
    ])
      expect(props.safeParse({ ...input, ...patch }).success, JSON.stringify(patch)).toBe(false);
    expect(props.safeParse({ ...old, candidates: input.candidates }).success).toBe(false);
    const malicious = {
      ...seed,
      eligible: ["cal"],
      viewer: "cal",
      ballots: [{ memberId: "cal", choice: ["outside"] }],
    };
    expect(voteFacts(seed, { [voteRecordKind]: [malicious] }, closes - 1).can_vote).toBe(false);
  });
});

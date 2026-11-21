import { describe, expect, it } from "vitest";
import {
  components,
  createRegistry,
  liveProps,
  readComponent,
  stampItemIds,
  type CastLike,
  type Definition,
} from "@lmthing/ui/catalog";

const { Members, Dues, Vote, SignUpSheet, Minutes } = components;
const drafts: Definition[] = [Members, Dues, Vote, SignUpSheet, Minutes];
const core = createRegistry();
const empty = { things: [], items: [] };
const named: CastLike = {
  things: [{ type: "person", fields: ["name"] }],
  items: [{ id: "person", type: "person", sample: true, name: "Jordan" }],
};
const malformed: CastLike = { ...named, items: [{ ...named.items[0]!, name: 42 }] };

describe("community component contracts", () => {
  it.each(drafts.map((def) => [def.meta.id, def] as const))(
    "%s validates examples and cast-driven fallbacks",
    (_id, def) => {
      expect(def.examples.length).toBeGreaterThanOrEqual(2);
      for (const example of def.examples) expect(def.props.safeParse(example).success).toBe(true);
      for (const cast of [empty, named, malformed])
        expect(def.props.safeParse(def.fallback({ cast })).success).toBe(true);
      if (def.meta.status === "draft") {
        expect(def).not.toHaveProperty(def.meta.id);
        expect(JSON.stringify(def.fallback({ cast: named }))).toContain("Jordan");
        expect(JSON.stringify(def.fallback({ cast: empty }))).toContain("Item one");
      }
    },
  );

  it.each(drafts.map((def) => [def.meta.id, def] as const))(
    "%s declares parts and usable probes",
    (id, def) => {
      const { meta, probes } = def;
      const parts = [...(meta.parts ?? []), ...(meta.items?.parts ?? [])];
      expect(parts.every((part) => /^[a-z][a-z_0-9]*$/.test(part))).toBe(true);
      expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
      expect(meta.realPath).not.toBe("");
      expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: id }));
      expect(probes.some((probe) => probe.kind === "choose" && core.resolve(probe.expect))).toBe(true);
      expect(probes).toContainEqual(expect.objectContaining({ kind: "write", expect: id }));
      const read = probes.find((probe) => probe.kind === "read");
      expect(read).toBeDefined();
      if (read && meta.status === "draft") {
        const address = read.expect.address;
        const lines = readComponent(def, def.examples[read.screen], address.split("/")[0]!);
        const reading = lines.join("\n");
        if (id === "Vote") {
          // The read fixture cannot yet provide a trusted active voter.
          expect(reading).not.toMatch(/\[v1\/(?:for|against|abstain|cancel) /);
        } else {
          expect(reading).toContain(`[${address} ${read.expect.action}`);
        }
      }
    },
  );
});

it("preserves former membership data in brief mode while hiding presentation details", () => {
  const member = {
    ...Members.examples[0]!.members[0]!,
    ended: "2026-10-01",
  };
  const input = { detail: "brief" as const, members: [member] };
  const parsed = Members.props.parse(input);
  expect(parsed.members[0]).toMatchObject(member);
  if (Members.meta.status === "draft") {
    const shown = liveProps(Members.meta, stampItemIds(Members.meta, parsed), "m1", {});
    expect(shown.members).toMatchObject([{ id: "r1", roles: ["Secretary"], ended: undefined }]);
    expect(readComponent(Members, input, "m1").join("\n")).not.toContain("photo:people");
  }
});

it("holds claim and release actions until the host supplies permissions", () => {
  if (SignUpSheet.meta.status === "draft") {
    const reading = readComponent(SignUpSheet, SignUpSheet.examples[0], "s1").join("\n");
    expect(reading).not.toMatch(/\/(?:claim|release) press/);
  }
});

it("identifies the ledger receipt and motion link in the draft reader", () => {
  if (Dues.meta.status === "draft") {
    const reading = readComponent(Dues, Dues.examples[0], "d1").join("\n");
    expect(reading).toMatch(/r3: ana · receipt_1 · cash · 10 · 2026-03-10/);
    expect(reading).toContain("[d1/r3/void press]");
    expect(reading).not.toContain("[d1/r4/void press]");
  }
  if (Minutes.meta.status === "draft") {
    const reading = readComponent(Minutes, Minutes.examples[0], "m1").join("\n");
    expect(reading).toContain('r1: "Buy a shared tool shed"');
    expect(reading).toContain("[m1/r1 press");
  }
});

it("distinguishes otherwise identical cash receipts by member and receipt reference", () => {
  if (Dues.meta.status === "draft") {
    const input = Dues.examples[0]!;
    const ana = input.receipts[0]!;
    const receipts = [ana, { ...ana, id: "receipt_2", assessmentId: "lee_2026" }];
    const reading = readComponent(Dues, { ...input, receipts }, "d1").join("\n");
    expect(reading).toContain("r3: ana · receipt_1 · cash · 10 · 2026-03-10");
    expect(reading).toContain("r4: lee · receipt_2 · cash · 10 · 2026-03-10");
    expect(reading).toContain("[d1/r3/void press]");
    expect(reading).toContain("[d1/r4/void press]");
  }
});

it("rejects inconsistent membership records", () => {
  const row = Members.examples[0]!.members[0]!;
  for (const members of [
    [],
    [row, row],
    [{ ...row, id: "a-b" }],
    [{ ...row, ended: "2020-01-01" }],
    [{ ...row, roles: ["a", "b", "c", "d"] }],
    Array.from({ length: 31 }, (_, i) => ({ ...row, id: `m_${i}` })),
  ])
    expect(Members.props.safeParse({ members }).success).toBe(false);
});

it("accepts partial and voided receipts but rejects invalid amounts and dangling references", () => {
  const input = Dues.examples[0]!;
  const receipt = input.receipts[0]!;
  for (const receipts of [
    [{ ...receipt, assessmentId: "missing" }],
    [{ ...receipt, amount: 0 }],
    [{ ...receipt, method: "cheque" }],
    [receipt, receipt],
  ])
    expect(Dues.props.safeParse({ ...input, receipts }).success).toBe(false);
  expect(Dues.props.safeParse({ ...input, style: "member" }).success).toBe(false);
  expect(Dues.props.safeParse({ ...input, total: 25 }).success).toBe(false);
});

it("rejects duplicate ballots and compares actual instants across offsets", () => {
  const input = Vote.examples[0]!;
  const ballot = input.ballots[0]!;
  for (const invalid of [
    { ballots: [ballot, ballot] },
    { opens: "2026-11-18T19:00:00" },
    { closes: "2026-11-18T21:00:00+02:00" },
    { quorum: 0 },
    { rule: "plurality" },
    { outcome: "passed" },
  ])
    expect(Vote.props.safeParse({ ...input, ...invalid }).success).toBe(false);
});

it("rejects duplicate, off-sheet and excess claims", () => {
  const input = SignUpSheet.examples[0]!;
  expect(
    SignUpSheet.props.safeParse({
      ...input,
      claims: [...input.claims, { slotId: "tables", memberId: "lee" }],
    }).success,
  ).toBe(true);
  for (const claim of [
    input.claims[0],
    { slotId: "missing", memberId: "ana" },
    { slotId: "sign", memberId: "ana" },
  ])
    expect(SignUpSheet.props.safeParse({ ...input, claims: [...input.claims, claim] }).success).toBe(false);
});

it("requires approval pairs and valid action links", () => {
  const input = Minutes.examples[0]!;
  for (const invalid of [
    { approvedBy: undefined },
    { approvedAt: undefined },
    { actions: [{ ...input.actions[0], decisionId: "missing" }] },
    { decisions: [input.decisions[0], input.decisions[0]] },
    { color: "red" },
  ])
    expect(Minutes.props.safeParse({ ...input, ...invalid }).success).toBe(false);
});

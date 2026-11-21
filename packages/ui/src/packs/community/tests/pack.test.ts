import { readFileSync } from "node:fs";
import { URL, fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import {
  archetypes,
  checkArchetypes,
  checkPacks,
  components,
  createRegistry,
  packArchetypes,
  packComposeProbes,
  packExamples,
  packOf,
  packReady,
  packs,
  writerFormat,
} from "@lmthing/ui/catalog";

const draft = createRegistry({ packs: ["community"], includeDrafts: true });
const ids = ["Members", "Dues", "Vote", "SignUpSheet", "Minutes"] as const;
const cast = { things: [], items: [] };
const layouts = {
  noticeboard: {
    community_board: ["Header", "Card", "SectionTitle", "List", "Button"],
    community_contributions: ["Header", "SignUpSheet", "Note"],
  },
  meeting: {
    community_motion: ["Header", "Vote", "Note"],
    community_record: ["Header", "Minutes", "Note"],
  },
  membership: {
    community_register: ["Header", "Search", "Chips", "Members"],
    community_dues: ["Header", "Dues", "Note"],
  },
};

it("registers just the requested pack and excludes it from live use until ready", () => {
  const core = createRegistry();
  const live = createRegistry({ packs: ["community"] });
  const ready = packReady("community");
  if (!ready) expect(live.ids).toEqual(core.ids);
  expect(new Set(draft.ids)).toEqual(new Set([...core.ids, ...ids]));
  const draftFormat = JSON.stringify(writerFormat(draft));
  const liveFormat = JSON.stringify(writerFormat(live));
  for (const id of ids) {
    expect(packOf[id]).toBe("community");
    expect(core.ids).not.toContain(id);
    expect(draftFormat).toContain(`"const":"${id}"`);
    expect(liveFormat.includes(`"const":"${id}"`)).toBe(ready);
  }
  expect(draftFormat).not.toContain('"const":"GuestList"');
  for (const id of Object.keys(layouts)) {
    expect(core.archetypes).not.toHaveProperty(id);
    expect(Object.hasOwn(live.archetypes, id)).toBe(ready);
  }
});

it("validates all pack references and builds each neutral layout in order", () => {
  expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
  expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
  for (const meta of packArchetypes.community) {
    const plan = layouts[meta.id as keyof typeof layouts];
    expect(Object.keys(meta.layouts)).toEqual(Object.keys(plan));
    expect(meta.defaultLayout).toBe(Object.keys(plan)[0]);
    for (const [layout, recipe] of Object.entries(plan)) {
      const screen = draft.defaultLines(meta.id, layout, cast);
      expect(screen.components.map(({ c }) => c)).toEqual(recipe);
      for (const { c, id: _id, state: _state, ...input } of screen.components)
        expect(parseable(c, input), `${meta.id}/${layout}: ${c}`).toBe(true);
      expect(
        packComposeProbes.community.filter((probe) => probe.archetype === meta.id && probe.layout === layout),
      ).toHaveLength(1);
    }
  }
  expect(draft.defaultLines("noticeboard", "community_board", cast).components[3]).toMatchObject({
    c: "List",
    style: "expand",
  });
  expect(draft.defaultLines("meeting", "community_record", cast).components[0]).toMatchObject({
    c: "Header",
    style: "back",
  });
});

it("validates the worked Patch example and its linked seeds", () => {
  const text = readFileSync(fileURLToPath(new URL("../example.jsonl", import.meta.url)), "utf8");
  expect(packExamples.community).toBe(text);
  const lines = text
    .trimEnd()
    .split("\n")
    .map((line) => JSON.parse(line) as ExampleLine);
  expect(lines.map(({ c }) => c)).toEqual(
    Object.values(layouts).flatMap((plan) => Object.values(plan).flat()),
  );
  expect(new Set(lines.map(({ id }) => id)).size).toBe(lines.length);
  for (const { c, id: _id, ...input } of lines) expect(parseable(c, input), c).toBe(true);
  const { members } = components.Members.props.parse(inputOf(lines, "Members"));
  const { assessments, receipts } = components.Dues.props.parse(inputOf(lines, "Dues"));
  const { ballots, voteId, quorum } = components.Vote.props.parse(inputOf(lines, "Vote"));
  const { decisions, actions, chairId } = components.Minutes.props.parse(inputOf(lines, "Minutes"));
  const { claims } = components.SignUpSheet.props.parse(inputOf(lines, "SignUpSheet"));
  const register = new Map(members.map((member) => [member.id, member]));
  expect(register.size).toBe(12);
  expect(new Set(assessments.map(({ memberId }) => memberId))).toEqual(new Set(register.keys()));
  expect(assessments.reduce((sum, row) => sum + row.amount, 0)).toBe(300);
  expect(receipts.filter(({ voided }) => !voided).reduce((sum, row) => sum + row.amount, 0)).toBe(200);
  expect(quorum).toBe(8);
  expect(
    ["for", "against", "abstain"].map((choice) => ballots.filter((b) => b.choice === choice).length),
  ).toEqual([7, 3, 1]);
  expect(ballots.every(({ memberId }) => register.get(memberId)?.votingRights)).toBe(true);
  expect(claims.every(({ memberId }) => register.has(memberId))).toBe(true);
  expect(register.has(chairId)).toBe(true);
  expect(decisions[0]?.voteId).toBe(voteId);
  expect(actions.map(({ ownerId, done }) => [ownerId, done])).toEqual([
    ["ana", true],
    ["lee", false],
  ]);
});

type ExampleLine = { c: string; id: string } & Record<string, unknown>;

function parseable(c: string, input: unknown) {
  const id = draft.resolve(c);
  return id === c && draft.schema(id)?.safeParse(input).success;
}

function inputOf(lines: ExampleLine[], component: string) {
  const line = lines.find(({ c }) => c === component);
  if (!line) throw new Error(`Missing ${component} in Patch`);
  const { c: _c, id: _id, ...input } = line;
  return input;
}

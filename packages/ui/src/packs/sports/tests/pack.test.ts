import { readFileSync } from "node:fs";
import { URL } from "node:url";
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
  readComponent,
  scoreComposition,
  writerFormat,
  type CastLike,
  type Definition,
} from "@lmthing/ui/catalog";

const ids = ["Fixtures", "Scoreboard", "Standings", "Lineup", "MatchFeed", "Squad", "Bracket"] as const;
const scoped = createRegistry({ packs: ["sports"], includeDrafts: true });
const defs: Record<string, Definition> = components;
const cast: CastLike = { things: [], items: [] };

it("exposes Sports only in an opted-in registry and gates drafts out of live Writer formats", () => {
  const core = createRegistry();
  const live = createRegistry({ packs: ["sports"] });
  const ready = packReady("sports");
  expect(scoped.ids.filter((id) => !core.ids.includes(id)).sort()).toEqual([...ids].sort());
  if (!ready) expect(live.ids).toEqual(core.ids);
  const formats = [core, scoped, live].map((registry) => JSON.stringify(writerFormat(registry)));
  for (const id of ids) {
    const choice = `"const":"${id}"`;
    expect(formats.map((format) => format.includes(choice))).toEqual([false, true, ready]);
    expect(packOf[id]).toBe("sports");
  }
  for (const { id } of packArchetypes.sports) {
    expect(core.archetypes).not.toHaveProperty(id);
    expect(scoped.archetypes).toHaveProperty(id);
    expect(Object.hasOwn(live.archetypes, id)).toBe(ready);
  }
});

it("validates the generated contracts and every line of Sunday Kickers", () => {
  expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
  expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
  const example = readFileSync(new URL("../example.jsonl", import.meta.url), "utf8");
  expect(packExamples.sports).toBe(example);
  const lines = example
    .trimEnd()
    .split("\n")
    .map((line) => JSON.parse(line) as { id: string; c: string } & Record<string, unknown>);
  expect(new Set(lines.map(({ id }) => id)).size).toBe(lines.length);
  expect(lines.map(({ c }) => c)).toEqual(expect.arrayContaining([...ids]));
  for (const { id, c, ...input } of lines) {
    expect(scoped.ids).toContain(c);
    expect(defs[c]?.props.safeParse(input).success, `${id}/${c}`).toBe(true);
  }
  expect(lines.flatMap(({ c }) => defs[c]?.meta.signature ?? [])).toEqual(["count_up"]);
  const lineFor = (id: string) => wireProps(lines.find(({ c }) => c === id)!);
  const score = components.Scoreboard.props.parse(lineFor("Scoreboard"));
  const { events } = components.MatchFeed.props.parse(lineFor("MatchFeed"));
  const goals = (side: string) =>
    events.filter((event) => event.kind === "goal" && event.side === side).length;
  expect([score.homeScore, score.awayScore]).toEqual([goals("home"), goals("away")]);
});

it("completes each documented layout from neutral cast defaults and has one compose probe each", () => {
  const recipes = {
    "club/next": ["Header", "Fixtures", "Squad", "Button"],
    "match/live": ["Header", "Scoreboard", "MatchFeed"],
    "match/lineup": ["Header", "Scoreboard", "Lineup"],
    "league/table": ["Header", "Segmented", "Standings"],
    "league/results": ["Header", "Fixtures", "SectionTitle", "List"],
    "cup/bracket": ["Header", "Bracket", "Fixtures"],
  };
  expect(packComposeProbes.sports.map(({ archetype, layout }) => `${archetype}/${layout}`).sort()).toEqual(
    Object.keys(recipes).sort(),
  );
  for (const [path, order] of Object.entries(recipes)) {
    const [archetype, layout] = path.split("/") as [string, string];
    const screen = scoped.defaultLines(archetype, layout, cast);
    expect(
      screen.components.map(({ c }) => c),
      path,
    ).toEqual(order);
    expect(
      scoreComposition(JSON.stringify(screen), scoped.archetypes[archetype]!.meta, layout, defs).issues,
      path,
    ).toEqual([]);
  }
  expect(scoped.defaultLines("club", "next", cast).components[1]).toMatchObject({ style: "next" });
  expect(scoped.defaultLines("league", "results", cast).components.at(-1)).toMatchObject({
    lead: "number",
    trail: "value",
  });
});

it.each(ids)("%s has strict examples, cast fallbacks and chooser/writer/reader probes", (id) => {
  const def = defs[id]!;
  const core = createRegistry();
  expect(def.examples.length).toBeGreaterThanOrEqual(2);
  for (const example of def.examples) expect(def.props.safeParse(example).success).toBe(true);
  for (const items of [
    [],
    [{ id: "p1", type: "player", sample: true, name: "Fern" }],
    [{ id: "p1", type: "player", sample: true, name: 5, bio: false }],
  ]) {
    const input = def.fallback({ cast: { things: [{ type: "player", fields: ["name", "bio"] }], items } });
    expect(def.props.safeParse(input).success).toBe(true);
    expect(JSON.stringify(input)).toContain(items[0]?.name === "Fern" ? "Fern" : "Item one");
  }
  expect(def.probes.some((probe) => probe.kind === "choose" && probe.expect === id)).toBe(true);
  expect(
    def.probes.some((probe) => probe.kind === "choose" && core.ids.some((id) => id === probe.expect)),
  ).toBe(true);
  expect(def.probes.some((probe) => probe.kind === "write" && probe.expect === id)).toBe(true);
  const reads = def.probes.filter((probe) => probe.kind === "read");
  expect(reads.length).toBeGreaterThanOrEqual(1);
  for (const probe of reads) {
    const instance = probe.expect.address.split("/")[0]!;
    expect(readComponent(def, def.examples[probe.screen], instance).join("\n")).toContain(
      `[${probe.expect.address} ${probe.expect.action}`,
    );
  }
});

it.each(ids)("%s rejects undeclared properties and out-of-range data", (id) => {
  const invalid = {
    Fixtures: {
      matches: [{ date: "2026-02-30", time: "25:00", opponent: "Fern", home: true, goto: "match" }],
    },
    Scoreboard: { homeScore: -1 },
    Standings: { lines: [1, 1], mine: 20 },
    Lineup: { lines: [{ players: [{ number: 100, name: "Reed" }] }] },
    MatchFeed: { events: [{ minute: 131, side: "home", kind: "goal", text: "Reed scores" }] },
    Squad: { needed: 0 },
    Bracket: {
      rounds: [{ label: "Final", ties: Array.from({ length: 9 }, () => ({ a: "Fern", b: "Oak" })) }],
    },
  };
  const def = defs[id]!;
  for (const extra of [{ color: "red" }, { style: "not_a_style" }, invalid[id]]) {
    expect(def.props.safeParse({ ...(def.examples[0] as object), ...extra }).success).toBe(false);
  }
});

it("only offers actions on visible fixtures, keeper controls and eligible squad rows", () => {
  const fixture = components.Fixtures;
  const next = readComponent(fixture, { ...fixture.examples[0], style: "next" }, "f1").join("\n");
  expect(next).toContain("[f1/r1 press");
  expect(next).not.toContain("[f1/r2 press");
  const score = components.Scoreboard;
  const display = readComponent(score, { ...score.examples[0], style: "display" }, "s1").join("\n");
  expect(display).not.toMatch(/\[(s1\/home|s1\/away|s1\/clock) /);
  const squad = components.Squad;
  const player = readComponent(squad, { ...squad.examples[0], coach: false }, "s1").join("\n");
  expect(player).toContain("[s1/r1/answer select");
  expect(player).not.toMatch(/\[s1\/r2\/answer |\/picked check/);
});
function wireProps({ id: _id, c: _c, ...input }: Record<string, unknown>) {
  return input;
}

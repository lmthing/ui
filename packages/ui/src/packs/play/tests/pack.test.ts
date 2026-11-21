import { selectedIds, selectedLayouts } from "../../../../scripts/build";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import { expect, it } from "vitest";
import {
  archetypes,
  checkArchetypes,
  checkPacks,
  checkScreen,
  components,
  createRegistry,
  packArchetypes,
  packComposition,
  packExamples,
  packOf,
  packReady,
  packs,
  writerFormat,
  type ArchetypeMeta,
  type Definition,
} from "@lmthing/ui/catalog";
import { example } from "../index";

const workedExampleIds = ["ScoreSheet", "Dice", "Spinner", "Trivia", "TurnOrder", "TeamPicker"] as const;
const ids = [...workedExampleIds, "LifeCounter", "PassReveal", "CardDeck", "BuzzerPad"] as const;
const layouts = {
  game_night: ["play_teams", "play_turns", "play_chance"],
  score_round: ["play_scores", "play_results"],
  trivia_round: ["play_question", "play_awards"],
};
const cast = { things: [], items: [] };
const definitions = components as Record<string, Definition>;

it("generates the play contracts and gates live registry access on pack readiness", () => {
  const core = createRegistry();
  const live = createRegistry({ packs: ["play"] });
  const draft = createRegistry({ packs: ["play"], includeDrafts: true });
  const ready = packReady("play");
  if (!ready) expect(live.ids).toEqual(core.ids);
  expect(ids.filter((id) => draft.ids.includes(id))).toEqual(ids);
  expect(ids.filter((id) => core.ids.includes(id))).toEqual([]);
  const format = JSON.stringify(writerFormat(draft));
  const liveFormat = JSON.stringify(writerFormat(live));
  for (const id of selectedIds(ids)) {
    expect(packOf[id as keyof typeof packOf]).toBe("play");
    expect(format).toContain(`"const":"${id}"`);
    expect(liveFormat.includes(`"const":"${id}"`)).toBe(ready);
  }
  for (const id of Object.keys(layouts)) {
    expect(Object.hasOwn(core.archetypes, id)).toBe(false);
    expect(Object.hasOwn(live.archetypes, id)).toBe(ready);
    expect(Object.hasOwn(draft.archetypes, id)).toBe(true);
  }
});
it("checks every recipe, layout, neutral default and core isolation", () => {
  expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
  expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
  const registry = createRegistry({ packs: ["play"], includeDrafts: true });
  expect(packArchetypes.play).toHaveLength(3);
  for (const meta of packArchetypes.play as readonly ArchetypeMeta[]) {
    expect(meta).not.toHaveProperty("status");
    expect(Object.keys(meta.layouts)).toEqual(layouts[meta.id as keyof typeof layouts]);
    expect(Object.keys(packComposition(meta).layouts)).toEqual(Object.keys(meta.layouts));
    for (const [layout, data] of Object.entries(meta.layouts)) {
      if (selectedLayouts([packComposition(meta)])?.includes(`${meta.id}/${layout}`) === false) continue;
      for (const slot of data.recipe)
        for (const id of slot.allow)
          expect(!(id in packOf) || packOf[id as keyof typeof packOf] === "play").toBe(true);
      const screen = registry.defaultLines(meta.id, layout, cast);
      expect(checkScreen(screen, registry)).toEqual([]);
      expect(screen.components.map((line) => line.c)).toEqual(data.defaults.map((line) => line.c));
    }
  }
  expect(packs.play.probes.filter((probe) => probe.kind === "pack").length).toBeGreaterThanOrEqual(3);
  expect(packs.play.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Counter" }));
});
it("defaults to numbered results without inventing score totals", () => {
  const registry = createRegistry({ packs: ["play"], includeDrafts: true });
  const screen = registry.defaultLines("score_round", "play_results", cast);
  const { id: _id, c: _c, ...input } = screen.components.find(({ c }) => c === "List")!;
  const list = components.List.props.parse(input);
  expect(list).toMatchObject({ lead: "number", trail: "value", style: undefined });
  expect(list.rows.every(({ value, trail }) => value === undefined && trail === "none")).toBe(true);
});
it("defaults to one score column at a time when awarding points", () => {
  const registry = createRegistry({ packs: ["play"], includeDrafts: true });
  const screen = registry.defaultLines("trivia_round", "play_awards", cast);
  expect(screen.components.find(({ c }) => c === "ScoreSheet")).toMatchObject({ overflow: "page" });
});
it("validates each worked-example line and preserves score-record totals and ties", async () => {
  const source = await readFile(new URL("../example.jsonl", import.meta.url), "utf8");
  const lines = source
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(source).toBe(example);
  expect(packExamples.play).toBe(source);
  expect(new Set(lines.map((line) => line.id)).size).toBe(lines.length);
  for (const { id, c, ...input } of lines) {
    expect(typeof id).toBe("string");
    expect(definitions[c]!.props.safeParse(input).success).toBe(true);
  }
  for (const id of selectedIds(workedExampleIds)) expect(lines.some((line) => line.c === id)).toBe(true);
  const { id: _id, c: _c, ...scoreInput } = lines.find((line) => line.c === "ScoreSheet");
  const scores = components.ScoreSheet.props.parse(scoreInput);
  expect(scores.overflow).toBe("page");
  const totals = scores.players
    .map((player, index) => ({
      title: player.name,
      value: String(scores.rounds.reduce((sum, round) => sum + (round.points[index] ?? 0), 0)),
    }))
    .sort((left, right) => Number(right.value) - Number(left.value));
  const { id: _listId, c: _listName, ...listInput } = lines.find((line) => line.c === "List");
  const list = components.List.props.parse(listInput);
  expect(list).toMatchObject({ lead: "number", trail: "value", style: undefined });
  expect(list.rows.every(({ trail }) => trail === "value")).toBe(true);
  expect(list.rows.map(({ title, value }) => ({ title, value }))).toEqual(totals);
});

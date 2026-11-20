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
  scoreComposition,
  writerFormat,
  type ArchetypeMeta,
  type ScreenLike,
} from "@lmthing/ui/catalog";
import { example } from "..";

const ids = ["Entries", "Factors", "Feelings", "Breathe", "SleepLog", "Soundscape", "Patterns"];
const layouts = {
  checkin: ["quick", "full"],
  settle: ["breathe", "sounds"],
  insights: ["week"],
  sleep: ["log"],
};
const draft = createRegistry({ packs: ["mind"], includeDrafts: true });
const cast = { things: [], items: [] };
const defs = Object.fromEntries(draft.defs.map((def) => [def.meta.id, def]));

it("generates the complete mind catalog and isolates it until the pack is ready", () => {
  const core = createRegistry();
  const live = createRegistry({ packs: ["mind"] });
  const ready = packReady("mind");
  if (!ready) expect(live.ids).toEqual(core.ids);
  expect(
    Object.keys(packOf)
      .filter((id) => packOf[id as keyof typeof packOf] === "mind")
      .sort(),
  ).toEqual([...ids].sort());
  const format = JSON.stringify(writerFormat(draft));
  const liveFormat = JSON.stringify(writerFormat(live));
  for (const id of ids) {
    expect(core.ids).not.toContain(id);
    expect(draft.ids).toContain(id);
    expect(format).toContain(`"const":"${id}"`);
    expect(liveFormat.includes(`"const":"${id}"`)).toBe(ready);
  }
  for (const id of Object.keys(layouts)) {
    expect(Object.hasOwn(core.archetypes, id)).toBe(false);
    expect(Object.hasOwn(live.archetypes, id)).toBe(ready);
    expect(Object.hasOwn(draft.archetypes, id)).toBe(true);
  }
  expect(packs.mind.probes.filter((probe) => probe.kind === "pack")).toHaveLength(3);
  expect(packs.mind.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Scale" }));
});

it("validates all recipes and all six neutral defaults through the compose scorer", () => {
  expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
  expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
  expect(packArchetypes.mind.map(({ id }) => id).sort()).toEqual(Object.keys(layouts).sort());
  for (const meta of packArchetypes.mind) {
    expect(meta).not.toHaveProperty("status");
    expect(Object.keys(meta.layouts)).toEqual(layouts[meta.id]);
    for (const [layout, data] of Object.entries((meta as ArchetypeMeta).layouts)) {
      const screen = draft.defaultLines(meta.id, layout, cast);
      expect(screen.components.map(({ c }) => c)).toEqual(data.defaults.map(({ c }) => c));
      expect(scoreComposition(JSON.stringify(screen), packComposition(meta), layout, defs).issues).toEqual(
        [],
      );
    }
  }
});

it("validates every Tide line, screen and internal navigation target", async () => {
  const source = await readFile(new URL("../example.jsonl", import.meta.url), "utf8");
  expect(source).toBe(example);
  expect(source).toBe(packExamples.mind);
  const lines = source
    .trim()
    .split("\n")
    .map((line): ScreenLike["components"][number] => JSON.parse(line));
  expect(new Set(lines.map(({ id }) => id)).size).toBe(lines.length);
  for (const id of ids) expect(lines.some(({ c }) => c === id)).toBe(true);
  const screens: ScreenLike[] = [];
  for (const line of lines) {
    if (line.c === "Header") screens.push({ id: line.id, components: [] });
    screens.at(-1)!.components.push(line);
  }
  for (const screen of screens) expect(checkScreen(screen, draft)).toEqual([]);
  const targets = screens.map(({ id }) => id);
  for (const line of lines) {
    if (typeof line.goto === "string") expect(targets).toContain(line.goto);
    if (Array.isArray(line.entries)) for (const row of line.entries) expect(targets).toContain(row.goto);
  }
  const { items } = lines.find(({ c }) => c === "Factors")!;
  const checkinFactors = components.Factors.props.parse({ items });
  const { factors, minDays } = lines.find(({ c }) => c === "Patterns")!;
  const patterns = components.Patterns.props.parse({ factors, minDays });
  expect(checkinFactors.items.map(({ label }) => label)).toEqual(expect.arrayContaining(patterns.factors));
  const { tiles } = lines.find(({ id }) => id === "week_stats")!;
  const stats = components.Stats.props.parse({ tiles });
  expect(patterns.minDays).toBe(14);
  expect(stats.tiles).toMatchObject([
    { label: "Mood days (2 weeks)", value: "14" },
    { label: "Nights this week", value: "7" },
  ]);
});

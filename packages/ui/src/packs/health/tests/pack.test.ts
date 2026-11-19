import { selectedIds, selectedLayouts } from "../../../../scripts/build";
import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { example } from "..";
import {
  archetypes,
  buildPackIndex,
  checkArchetypes,
  checkPacks,
  checkScreen,
  components,
  createRegistry,
  packArchetypes,
  packExamples,
  packOf,
  packReady,
  packs,
  writerFormat,
  packComposition,
  scoreComposition,
  type CastLike,
  type ArchetypeMeta,
} from "@lmthing/ui/catalog";

const casts: CastLike[] = [
  { things: [], items: [] },
  {
    things: [{ type: "record", fields: ["title", "detail"] }],
    items: [{ id: "r1", type: "record", sample: true, title: "Morning", detail: "Today" }],
  },
];
const layouts = {
  today: ["rings", "meds"],
  workout: ["log", "exercise", "history"],
  body_trends: ["measure", "summary", "add"],
  bodylog: ["symptoms", "vitals", "cycle", "med_edit"],
};

it("keeps the root door's worked example synchronized with the JSON Lines file", () => {
  expect(example).toBe(readFileSync(new URL("../example.jsonl", import.meta.url), "utf8"));
  expect(packExamples.health).toBe(example);
});

it("validates generated metadata, archetypes and each worked line", () => {
  expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
  expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
  const registry = createRegistry({ packs: ["health"], includeDrafts: true });
  const lines = packExamples.health
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  for (const { id, c, ...input } of lines) {
    expect(id).toMatch(/^[a-z][a-z0-9_]*$/);
    expect(registry.schema(c)?.safeParse(input).success).toBe(true);
  }
  const health = Object.keys(packOf).filter((id) => packOf[id as keyof typeof packOf] === "health");
  for (const id of selectedIds(health)) expect(lines.some((line) => line.c === id)).toBe(true);
  for (const [start, end] of [
    [0, 3],
    [3, 6],
    [6, 9],
  ]) {
    expect(checkScreen({ id: "rep", components: lines.slice(start, end) }, registry)).toEqual([]);
  }
});
it("keeps the default core registry isolated and loads health only when ready", () => {
  const core = createRegistry();
  const live = createRegistry({ packs: ["health"] });
  const draft = createRegistry({ packs: ["health"], includeDrafts: true });
  const health = Object.keys(packOf).filter((id) => packOf[id as keyof typeof packOf] === "health");
  expect(health).toHaveLength(9);
  expect(packReady("health")).toBe(true);
  expect(
    buildPackIndex()
      .split("\n")
      .some((line) => line.startsWith("- health: ")),
  ).toBe(true);
  expect(draft.ids.filter((id) => health.includes(id))).toHaveLength(9);
  expect(live.ids.filter((id) => !health.includes(id))).toEqual(core.ids);
  expect(live.ids.filter((id) => health.includes(id))).toHaveLength(9);
  for (const id of selectedIds(health)) {
    expect(core.ids).not.toContain(id);
    expect(JSON.stringify(writerFormat(core))).not.toContain(`"const":"${id}"`);
    expect(JSON.stringify(writerFormat(draft))).toContain(`"const":"${id}"`);
    expect(JSON.stringify(writerFormat(live))).toContain(`"const":"${id}"`);
  }
  expect(packs.health.probes.filter((probe) => probe.kind === "pack")).toHaveLength(4);
  expect(packs.health.probes.find((probe) => probe.kind === "choose")).toMatchObject({ expect: "Ring" });
});
it("completes every layout's neutral defaults and checks the real compose scorer", () => {
  const registry = createRegistry({ packs: ["health"], includeDrafts: true });
  const defs = Object.fromEntries(registry.defs.map((def) => [def.meta.id, def]));
  expect(packArchetypes.health).toHaveLength(4);
  for (const meta of packArchetypes.health as readonly ArchetypeMeta[]) {
    expect(meta).not.toHaveProperty("status");
    expect(Object.keys(meta.layouts)).toEqual(layouts[meta.id as keyof typeof layouts]);
    for (const layout of Object.keys(meta.layouts)) {
      if (selectedLayouts([packComposition(meta)])?.includes(`${meta.id}/${layout}`) === false) continue;
      for (const cast of casts) {
        const screen = registry.defaultLines(meta.id, layout, cast);
        expect(checkScreen(screen, registry)).toEqual([]);
        expect(scoreComposition(JSON.stringify(screen), packComposition(meta), layout, defs).issues).toEqual(
          [],
        );
        expect(screen.components.map((line) => line.c)).toEqual(
          meta.layouts[layout]!.defaults.map((line) => line.c),
        );
      }
      for (const slot of meta.layouts[layout]!.recipe)
        for (const id of slot.allow) expect(packOf[id as keyof typeof packOf] ?? "health").toBe("health");
    }
  }
});

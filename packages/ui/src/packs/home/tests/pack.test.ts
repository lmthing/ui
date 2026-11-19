import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import { expect, it } from "vitest";
import {
  archetypes,
  buildPackIndex,
  checkArchetypes,
  checkPacks,
  checkScreen,
  components,
  createRegistry,
  packs,
  packOf,
  packReady,
  packExamples,
  packArchetypes,
  writerFormat,
  type CastLike,
  type PackProbe,
} from "@lmthing/ui/catalog";
import { example, pack, Chores, Rewards, CareSchedule, Turns, Agenda, BabyLog, Devices } from "..";

const ids = ["Chores", "Rewards", "CareSchedule", "Turns", "Agenda", "BabyLog", "Devices"];
const cast: CastLike = { things: [], items: [] };

it("exports every contract, metadata and the exact worked example through its root door", async () => {
  expect(pack.id).toBe("home");
  expect([Chores, Rewards, CareSchedule, Turns, Agenda, BabyLog, Devices].map((def) => def.meta.id)).toEqual(
    ids,
  );
  expect(example).toBe(await readFile(new URL("../example.jsonl", import.meta.url), "utf8"));
  expect(packExamples.home).toBe(example);
  const registry = createRegistry({ packs: ["home"], includeDrafts: true });
  const lines = example
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  for (const { id, c, ...input } of lines) {
    expect(id).toMatch(/^[a-z][a-z0-9_]*$/);
    expect(registry.schema(c)?.safeParse(input).success).toBe(true);
  }
  expect(new Set(lines.map((line) => line.id)).size).toBe(lines.length);
  expect(ids.every((id) => lines.some((line) => line.c === id))).toBe(true);
  expect(lines.find((line) => line.id === "c1").tasks).toHaveLength(12);
});

it("keeps an incomplete pack out of live registries and core prompts", () => {
  const ready = packReady("home");
  const core = createRegistry(),
    live = createRegistry({ packs: ["home"] });
  const draft = createRegistry({ packs: ["home"], includeDrafts: true });
  expect(draft.ids.filter((id) => (packOf as Record<string, string>)[id] === "home")).toHaveLength(7);
  if (!ready) expect(live.ids).toEqual(core.ids);
  expect(core.ids.some((id) => ids.includes(id))).toBe(false);
  expect(core.archetypes).not.toHaveProperty("family");
  expect(Object.hasOwn(live.archetypes, "family")).toBe(ready);
  expect(/^home:/m.test(buildPackIndex())).toBe(ready);
  const format = JSON.stringify(writerFormat(draft));
  for (const id of ids) {
    expect(format).toContain(`"const":"${id}"`);
    expect(JSON.stringify(writerFormat(live)).includes(`"const":"${id}"`)).toBe(ready);
  }
  expect(format).not.toContain('"const":"Waitlist"');
  expect(format).not.toContain('"const":"ClientCard"');
});

it("validates all archetypes, their neutral defaults and core-first pack probes", () => {
  expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
  expect(checkArchetypes({ components, archetypes, packOf, packArchetypes })).toEqual([]);
  expect(packArchetypes.home).toHaveLength(5);
  const registry = createRegistry({ packs: ["home"], includeDrafts: true });
  let layouts = 0;
  for (const meta of packArchetypes.home) {
    expect(meta).not.toHaveProperty("status");
    for (const [layout, { recipe, defaults }] of Object.entries(meta.layouts)) {
      layouts++;
      expect(defaults).toHaveLength(recipe.length);
      for (const slot of recipe)
        for (const id of slot.allow)
          expect((packOf as Record<string, string>)[id] ?? "core").toMatch(/^(core|home)$/);
      const screen = registry.defaultLines(meta.id, layout, cast);
      expect(checkScreen(screen, registry)).toEqual([]);
    }
  }
  expect(layouts).toBe(11);
  expect(
    pack.probes.filter((probe) => probe.kind === "pack" && (probe as PackProbe).expect.includes("home")),
  ).toHaveLength(2);
  expect(pack.probes).toContainEqual(expect.objectContaining({ kind: "pack", expect: ["team"] }));
  expect(pack.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Checklist" }));
});

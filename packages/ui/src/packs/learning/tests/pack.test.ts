import { readFileSync } from "node:fs";
import { URL } from "node:url";
import {
  archetypes,
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
  packComposeProbes,
  writerFormat,
  type CastLike,
} from "@lmthing/ui/catalog";
import { describe, expect, it } from "vitest";

const ids = [
  "Lesson",
  "Quiz",
  "Flashcard",
  "Path",
  "Result",
  "Achievements",
  "Timetable",
  "Assignments",
  "Gradebook",
  "WorkedSolution",
  "SpeechCheck",
] as const;
const layouts = {
  course: { path: ["Header", "Streak", "Path", "Button"], list: ["Header", "Streak", "List", "Button"] },
  lesson: {
    teach: ["Header", "Steps", "Lesson"],
    quiz: ["Header", "Steps", "Quiz"],
    cards: ["Header", "Streak", "Flashcard"],
  },
  results: {
    result: ["Result", "Streak", "Button"],
    badges: ["Header", "Achievements", "List"],
    class: ["Header", "People", "Progress", "List"],
  },
  planner: { week: ["Header", "Timetable", "SectionTitle", "Assignments"] },
};
const empty: CastLike = { things: [], items: [] };
const draft = createRegistry({ packs: ["learning"], includeDrafts: true });

describe("learning scaffold", () => {
  it("scopes generated entries and Writer choices to core and the selected pack", () => {
    const core = createRegistry();
    const live = createRegistry({ packs: ["learning"] });
    const ready = packReady("learning");
    const format = JSON.stringify(writerFormat(draft));
    const liveFormat = JSON.stringify(writerFormat(live));
    expect(new Set(draft.ids.filter((id) => id in packOf))).toEqual(new Set(ids));
    expect(format).toContain('"const":"Streak"');
    for (const id of ids) {
      expect(core.ids).not.toContain(id);
      expect(live.ids.includes(id)).toBe(ready);
      expect(format).toContain(`"const":"${id}"`);
      expect(liveFormat.includes(`"const":"${id}"`)).toBe(ready);
    }
    expect(format).not.toContain('"const":"Appointment"');
    expect(Object.hasOwn(live.archetypes, "course")).toBe(ready);
    expect(draft.archetypes).toHaveProperty("course");
  });

  it("validates pack metadata and the exact worked example through the scoped registry", () => {
    expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
    expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
    const source = readFileSync(new URL("../example.jsonl", import.meta.url), "utf8");
    expect(packExamples.learning).toBe(source);
    const lines = source
      .trimEnd()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(new Set(lines.map(({ id }) => id)).size).toBe(lines.length);
    for (const id of ids) expect(lines.some(({ c }) => c === id)).toBe(true);
    for (const { id, c, ...input } of lines) {
      expect(id).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(draft.schema(c)?.safeParse(input).success, c).toBe(true);
    }
  });

  it("completes and validates defaults, ownership and compose probes for each layout", () => {
    expect(new Set(packArchetypes.learning.map(({ id }) => id))).toEqual(new Set(Object.keys(layouts)));
    const expectedProbes = [];
    for (const [archetype, variants] of Object.entries(layouts)) {
      const meta = packArchetypes.learning.find(({ id }) => id === archetype)!;
      expect(Object.keys(meta.layouts)).toEqual(Object.keys(variants));
      for (const [layout, ids] of Object.entries(variants)) {
        expectedProbes.push(`${archetype}/${layout}`);
        const screen = draft.defaultLines(archetype, layout, empty);
        expect(checkScreen(screen, draft), `${archetype}/${layout}`).toEqual([]);
        expect(screen.components.map(({ c }) => c)).toEqual(ids);
        for (const id of ids) if (id in packOf) expect(packOf[id as keyof typeof packOf]).toBe("learning");
        if (archetype === "results" && layout !== "result")
          expect(screen.components.at(-1)).toMatchObject({ c: "List", lead: "number", trail: "value" });
      }
    }
    expect(
      packComposeProbes.learning.map(({ archetype, layout }) => `${archetype}/${layout}`).sort(),
    ).toEqual(expectedProbes.sort());
  });
});

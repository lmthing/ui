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
  scoreComposition,
  writerFormat,
  type Definition,
} from "@lmthing/ui/catalog";

const ids = ["Tasks", "Milestones", "Gantt", "TimeLog", "Scope", "ProjectStatus", "ProjectBrief"];
const scoped = createRegistry({ packs: ["projects"], includeDrafts: true });
const recipes = {
  "project/projects_overview": ["Header", "Card", "KeyValue", "Progress", "Milestones", "Button"],
  "project/projects_scope": ["Header", "Scope", "Note", "Button"],
  "my_tasks/projects_assigned": ["Header", "Chips", "Tasks", "Button"],
  "my_tasks/projects_task_edit": ["Header", "Field", "Field", "Field", "Composer", "Button"],
  "plan/projects_gates": ["Header", "Milestones", "Note", "Button"],
  "plan/projects_ranges": ["Header", "Gantt", "Note", "Button"],
  "timesheet_week/projects_time_week": ["Header", "TimeLog", "Bars", "Note"],
  "timesheet_week/projects_time_entry": [
    "Header",
    "Field",
    "Field",
    "Field",
    "Field",
    "Field",
    "Composer",
    "Button",
  ],
};

it("excludes Projects from core and gates explicitly selected live access on pack readiness", () => {
  const core = createRegistry();
  const live = createRegistry({ packs: ["projects"] });
  const ready = packReady("projects");
  expect(scoped.ids.filter((id) => !core.ids.includes(id)).sort()).toEqual([...ids].sort());
  if (!ready) expect(live.ids).toEqual(core.ids);
  const formats = [core, scoped, live].map((registry) => JSON.stringify(writerFormat(registry)));
  for (const id of ids) {
    const choice = `"const":"${id}"`;
    expect(formats.map((format) => format.includes(choice))).toEqual([false, true, ready]);
  }
  for (const { id } of packArchetypes.projects) {
    expect(core.archetypes).not.toHaveProperty(id);
    expect(scoped.archetypes).toHaveProperty(id);
    expect(Object.hasOwn(live.archetypes, id)).toBe(ready);
  }
});

it("validates catalog metadata and every Folio line, with one bars_grow signature", () => {
  expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
  expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
  const example = readFileSync(new URL("../example.jsonl", import.meta.url), "utf8");
  expect(packExamples.projects).toBe(example);
  const lines = example
    .trimEnd()
    .split("\n")
    .map((line) => JSON.parse(line) as { id: string; c: string } & Record<string, unknown>);
  const defs: Record<string, Definition> = components;
  expect(new Set(lines.map(({ id }) => id)).size).toBe(lines.length);
  for (const { id, c, ...props } of lines)
    expect(scoped.defs.find(({ meta }) => meta.id === c)?.props.safeParse(props).success, `${id}/${c}`).toBe(
      true,
    );
  expect(lines.map(({ c }) => c)).toEqual(expect.arrayContaining(ids));
  expect(lines.flatMap(({ c }) => defs[c]?.meta.signature ?? [])).toEqual(["bars_grow"]);
});

it("completes all eight layouts with neutral defaults and defines a probe per layout", () => {
  const defs = Object.fromEntries(scoped.defs.map((def) => [def.meta.id, def]));
  const cast = { things: [], items: [] };
  expect(packComposeProbes.projects.map(({ archetype, layout }) => `${archetype}/${layout}`).sort()).toEqual(
    Object.keys(recipes).sort(),
  );
  for (const { layouts, defaultLayout } of packArchetypes.projects)
    expect(Object.keys(layouts)[0]).toBe(defaultLayout);
  for (const [path, order] of Object.entries(recipes)) {
    const [archetype, layout] = path.split("/") as [string, string];
    const screen = scoped.defaultLines(archetype, layout, cast);
    expect(
      screen.components.map(({ c }) => c),
      path,
    ).toEqual(order);
    if (layout === "projects_time_entry")
      expect(screen.components.filter(({ c }) => c === "Field").map(({ kind }) => kind)).toEqual([
        "date",
        "time",
        "time",
        "choice",
        "toggle",
      ]);
    expect(
      scoreComposition(JSON.stringify(screen), scoped.archetypes[archetype]!.meta, layout, defs).issues,
      path,
    ).toEqual([]);
  }
});

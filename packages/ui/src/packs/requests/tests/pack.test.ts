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

const ids = ["RequestQueue", "RequestTriage", "RequestThread", "WorkOrder", "RequestResolution", "SlaPolicy"];
const scoped = createRegistry({ packs: ["requests"], includeDrafts: true });
const recipes = {
  "report_issue/requests_intake": ["Header", "Field", "Field", "Choice", "Composer", "Button"],
  "report_issue/requests_evidence": ["Header", "Field", "Note", "Button"],
  "report_issue/requests_submitted": ["Header", "Success", "Card", "Button"],
  "queue/requests_active": ["Header", "Search", "Chips", "RequestQueue", "Button"],
  "queue/requests_triage": ["Header", "Card", "RequestTriage", "Note"],
  "queue/requests_dispatch": ["Header", "Field", "Field", "Field", "Field", "WorkOrder", "Button"],
  "request_detail/requests_overview": ["Header", "Card", "KeyValue", "List", "Button"],
  "request_detail/requests_updates": ["Header", "Card", "RequestThread"],
  "request_detail/requests_work": ["Header", "KeyValue", "WorkOrder", "Note"],
  "request_detail/requests_resolution": ["Header", "RequestResolution", "Note"],
  "request_detail/requests_feedback": ["Header", "Scale", "Composer", "Button"],
};

it("registers only core and Requests drafts until the whole pack is ready", () => {
  const core = createRegistry();
  const live = createRegistry({ packs: ["requests"] });
  const ready = packReady("requests");
  expect(
    Object.entries(packOf)
      .filter(([, owner]) => owner === "requests")
      .map(([id]) => id)
      .sort(),
  ).toEqual([...ids].sort());
  expect(scoped.ids.filter((id) => !core.ids.includes(id))).toEqual(expect.arrayContaining(ids));
  expect(scoped.ids).toHaveLength(core.ids.length + ids.length);
  const draftFormat = JSON.stringify(writerFormat(scoped));
  const liveFormat = JSON.stringify(writerFormat(live));
  for (const id of ids) {
    expect(core.ids).not.toContain(id);
    expect(draftFormat).toContain(`"const":"${id}"`);
    expect(live.ids.includes(id)).toBe(ready);
    expect(liveFormat.includes(`"const":"${id}"`)).toBe(ready);
  }
  for (const name of ["report_issue", "queue", "request_detail"]) {
    expect(core.archetypes).not.toHaveProperty(name);
    expect(scoped.archetypes).toHaveProperty(name);
    expect(Object.hasOwn(live.archetypes, name)).toBe(ready);
  }
});

it("validates pack metadata and every worked example line, including the single signature", () => {
  expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
  expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
  const text = readFileSync(new URL("../example.jsonl", import.meta.url), "utf8");
  expect(packExamples.requests).toBe(text);
  const lines = text
    .trimEnd()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(new Set(lines.map(({ id }) => id)).size).toBe(lines.length);
  for (const { c, id, ...props } of lines)
    expect(scoped.schema(c)?.safeParse(props).success, `${id}/${c}`).toBe(true);
  expect(lines.map(({ c }) => c)).toEqual(expect.arrayContaining(ids));
  const defs = components as Record<string, Definition>;
  expect(lines.flatMap(({ c }) => defs[c]?.meta.signature ?? [])).toEqual(["count_up"]);
});

it("validates the exact recipe order and neutral defaults for every compose layout", () => {
  const defs = Object.fromEntries(scoped.defs.map((def) => [def.meta.id, def])) as Record<string, Definition>;
  const cast = { things: [], items: [] };
  expect(packComposeProbes.requests.map(({ archetype, layout }) => `${archetype}/${layout}`).sort()).toEqual(
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
});

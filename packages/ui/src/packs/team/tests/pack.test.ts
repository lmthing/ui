import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { describe, expect, it } from "vitest";
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
  placeholderTitle,
  readComponent,
  scoreComposition,
  writerFormat,
  type CastLike,
  type Definition,
} from "@lmthing/ui/catalog";

const nearest = {
  Roster: "Timeline",
  Shift: "Card",
  OpenShift: "Checklist",
  TimeClock: "Timer",
  Timesheet: "Bars",
  Approval: "Checklist",
  Handover: "Composer",
} as const;
const ids = Object.keys(nearest) as (keyof typeof nearest)[];
const defs: Record<string, Definition> = components;
const scoped = createRegistry({ packs: ["team"], includeDrafts: true });
const neutral: CastLike = { things: [], items: [] };
const matching: CastLike = {
  things: [{ type: "worker", fields: ["label", "context"] }],
  items: [{ id: "lee", type: "worker", sample: true, label: "Lee", context: "First floor" }],
};
const malformed: CastLike = {
  things: matching.things,
  items: [{ id: "bad", type: "worker", sample: false, label: 4, context: {} }],
};

const recipes = {
  "team/today": ["Header", "TimeClock", "Shift", "Handover", "Checklist"],
  "rota/week": ["Header", "Segmented", "Roster", "People"],
  "rota/open": ["Header", "Banner", "OpenShift"],
  "approvals/requests": ["Header", "Segmented", "Approval"],
  "approvals/hours": ["Header", "Timesheet", "Bars"],
  "approvals/request": ["Header", "Choice", "Field", "Field", "Composer", "Button"],
};

describe("team pack scaffold", () => {
  it("registers only the requested pack and keeps incomplete Team out of live Writer choices", () => {
    const core = createRegistry();
    const live = createRegistry({ packs: ["team"] });
    const ready = packReady("team");
    const formats = [core, scoped, live].map((registry) => JSON.stringify(writerFormat(registry)));
    const owned = Object.entries(packOf).filter(([, owner]) => owner === "team");
    expect(owned.map(([id]) => id).sort()).toEqual([...ids].sort());
    expect(scoped.ids.filter((id) => !core.ids.includes(id)).sort()).toEqual([...ids].sort());
    if (!ready) expect(live.ids).toEqual(core.ids);
    for (const id of ids) {
      expect(scoped.schema(id)).toBe(components[id].props);
      expect(formats.map((format) => format.includes(`"const":"${id}"`))).toEqual([false, true, ready]);
    }
    for (const { id } of packArchetypes.team) {
      expect(core.archetypes).not.toHaveProperty(id);
      expect(scoped.archetypes).toHaveProperty(id);
      expect(Object.hasOwn(live.archetypes, id)).toBe(ready);
    }
  });

  it("validates pack and archetype metadata, and all six layouts from neutral defaults", () => {
    expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
    expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
    expect(packComposeProbes.team.map(({ archetype, layout }) => `${archetype}/${layout}`).sort()).toEqual(
      Object.keys(recipes).sort(),
    );
    for (const { defaultLayout, layouts } of packArchetypes.team)
      expect(Object.keys(layouts)[0]).toBe(defaultLayout);
    const scopedDefs = Object.fromEntries(scoped.defs.map((def) => [def.meta.id, def]));
    for (const [address, order] of Object.entries(recipes)) {
      const [id, layout] = address.split("/") as [string, string];
      const screen = scoped.defaultLines(id, layout, neutral);
      expect(
        screen.components.map(({ c }) => c),
        address,
      ).toEqual(order);
      expect(
        scoreComposition(JSON.stringify(screen), scoped.archetypes[id]!.meta, layout, scopedDefs).issues,
      ).toEqual([]);
    }
  });

  it("validates each Grind example line and uses check_burst as its only signature", () => {
    const example = readFileSync(new URL("../example.jsonl", import.meta.url), "utf8");
    expect(packExamples.team).toBe(example);
    const lines = example
      .trimEnd()
      .split("\n")
      .map((line) => JSON.parse(line) as { id: string; c: string } & Record<string, unknown>);
    expect(new Set(lines.map(({ id }) => id)).size).toBe(lines.length);
    expect(lines.map(({ c }) => c)).toEqual(expect.arrayContaining(ids));
    for (const { id, c, ...input } of lines) {
      const resolved = scoped.resolve(c);
      expect(resolved, id).toBe(c);
      expect(resolved && scoped.schema(resolved)?.safeParse(input).success, `${id}/${c}`).toBe(true);
    }
    expect(lines.flatMap(({ c }) => defs[c]?.meta.signature ?? [])).toEqual(["check_burst"]);
  });
});

describe.each(ids)("%s scaffold", (id) => {
  const def = defs[id]!;

  it("accepts domain examples and neutral, matching and malformed cast fallbacks", () => {
    expect(def.examples.length).toBeGreaterThanOrEqual(2);
    for (const example of def.examples) expect(def.props.safeParse(example).success).toBe(true);
    for (const cast of [neutral, matching, malformed])
      expect(def.props.safeParse(def.fallback({ cast })).success).toBe(true);
    if (def.meta.status === "draft") {
      expect(JSON.stringify(def.fallback({ cast: neutral }))).toContain(placeholderTitle(0));
      expect(JSON.stringify(def.fallback({ cast: matching }))).toContain("Lee");
    }
  });

  it("keeps probes well formed and read targets addressable", () => {
    expect(def.meta.realPath).not.toBe("");
    expect(def.meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    for (const part of [...(def.meta.parts ?? []), ...(def.meta.items?.parts ?? [])])
      expect(part).toMatch(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/);
    expect(def.probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: id }),
        expect.objectContaining({ kind: "choose", expect: nearest[id] }),
        expect.objectContaining({ kind: "write", expect: id }),
        expect.objectContaining({ kind: "read" }),
      ]),
    );
    for (const probe of def.probes) {
      if (probe.kind !== "read") continue;
      const instance = probe.expect.address.split("/")[0]!;
      const reading = readComponent(def, def.examples[probe.screen], instance).join("\n");
      expect(reading).toContain(`[${probe.expect.address} ${probe.expect.action}`);
    }
  });
});

describe("draft schema boundaries", () => {
  const { Roster, Shift, OpenShift, TimeClock, Timesheet, Approval, Handover } = components;
  const roster = Roster.examples[0]!;
  const timesheet = Timesheet.examples[0]!;
  const invalid = {
    Roster: [
      { ...roster, week: "2026-11-17" },
      { ...roster, people: [] },
      { ...roster, people: [{ name: "a".repeat(21), photo: "lib:people" }] },
      { ...roster, shifts: Array.from({ length: 41 }, () => roster.shifts[0]) },
      { ...roster, shifts: [{ ...roster.shifts[0], person: 2 }] },
      { ...roster, shifts: [{ ...roster.shifts[0], day: 7 }] },
    ],
    Shift: [
      { ...Shift.examples[0], status: "pending" },
      { ...Shift.examples[0], date: "2026-02-30" },
      { ...Shift.examples[0], from: "24:01" },
      { ...Shift.examples[0], place: "a".repeat(29) },
    ],
    OpenShift: [
      { shifts: [] },
      { shifts: Array.from({ length: 7 }, () => OpenShift.examples[0]!.shifts[0]) },
      { shifts: [{ ...OpenShift.examples[0]!.shifts[0], pay: -1 }] },
    ],
    TimeClock: [
      { ...TimeClock.examples[0], on: "yes" },
      { ...TimeClock.examples[0], elapsed: 120 },
    ],
    Timesheet: [
      { ...timesheet, rows: [{ ...timesheet.rows[0], hours: [8] }] },
      { ...timesheet, rows: [{ ...timesheet.rows[0], hours: [25, 0, 0, 0, 0, 0, 0] }] },
      { ...timesheet, rows: Array.from({ length: 9 }, () => timesheet.rows[0]) },
    ],
    Approval: [
      { requests: [] },
      { requests: [{ ...Approval.examples[0]!.requests[0], photo: "https://example.test/lee" }] },
      { requests: [{ ...Approval.examples[0]!.requests[0], kind: "day_off" }] },
    ],
    Handover: [{ notes: [] }, { notes: [{ ...Handover.examples[0]!.notes[0], text: "a".repeat(161) }] }],
  };

  it.each(ids)("%s rejects invalid boundaries and raw presentation keys while draft", (id) => {
    const def = defs[id]!;
    if (def.meta.status !== "draft") return;
    for (const input of invalid[id]) expect(def.props.safeParse(input).success).toBe(false);
    expect(def.props.safeParse({ ...(def.examples[0] as object), color: "#ff0000" }).success).toBe(false);
  });
});

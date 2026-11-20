import { expect, it } from "vitest";
import {
  affordancesOf,
  components,
  placeholderTitle,
  readComponent,
  stampItemIds,
  type CastLike,
  type Definition,
} from "@lmthing/ui/catalog";

const coreNearMisses = {
  Tasks: "Checklist",
  Milestones: "Timeline",
  Gantt: "Timeline",
  TimeLog: "Timer",
  Scope: "KeyValue",
} as const;
const cases = Object.entries(coreNearMisses) as [keyof typeof coreNearMisses, string][];
const item = { id: "map", type: "record", sample: true, label: "Map draft", summary: "Check the scale" };
const sample: CastLike = { things: [{ type: "record", fields: ["label", "summary"] }], items: [item] };
const malformed: CastLike = {
  things: sample.things,
  items: [{ ...item, label: 4, summary: " ".repeat(12) }],
};
const neutral: CastLike = { things: [], items: [] };

it.each(cases)("%s uses a strict contract, neutral fallback and core-first probes", (id, nearMiss) => {
  const def: Definition = components[id];
  expect(def.examples.length).toBeGreaterThanOrEqual(2);
  for (const example of def.examples) expect(def.props.safeParse(example).success).toBe(true);
  for (const cast of [neutral, sample, malformed])
    expect(def.props.safeParse(def.fallback({ cast })).success).toBe(true);
  if (def.meta.status === "draft") {
    expect(def).not.toHaveProperty(id);
    expect(JSON.stringify(def.fallback({ cast: neutral }))).toContain(placeholderTitle(0));
    expect(JSON.stringify(def.fallback({ cast: sample }))).toContain(item.label);
  }
  expect(def.props.safeParse({ ...(def.examples[0] as object), color: "purple" }).success).toBe(false);
  expect(def.meta.tier).toBe("phone");
  expect(def.meta.realPath).not.toBe("");
  expect(def.probes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: "choose", expect: id }),
      expect.objectContaining({ kind: "choose", expect: nearMiss }),
      expect.objectContaining({ kind: "write", expect: id }),
      expect.objectContaining({ kind: "read" }),
    ]),
  );
});

it("rejects task cycles, multi-level subtasks and completion written onto parents", () => {
  const def = components.Tasks;
  const [first, second] = def.examples[0]!.items;
  const [parent, childA, childB] = def.examples[1]!.items;
  for (const items of [
    [],
    Array.from({ length: 7 }, (_, i) => ({ ...first, taskRef: `task_${i}` })),
    [{ ...first, title: "a".repeat(33) }],
    [{ ...first, after: [second!.taskRef] }, second],
    [{ ...parent, state: "done" }, childA, childB],
    [parent, childA, { ...childB, parentRef: childA!.taskRef }],
  ])
    expect(def.props.safeParse({ items }).success).toBe(false);
  const read = readComponent(def, def.examples[0], "t1").join("\n");
  expect(read).toContain("[t1/r1/done check");
  expect(read).not.toContain("[t1/r2/done check");
  expect(read).not.toContain("/assign select");
  const addressed = stampItemIds(def.meta, def.props.parse(def.examples[0]));
  const withAssignees = {
    ...addressed,
    items: addressed.items.map((row, index) => ({ ...row, canAssign: index === 0 })),
  };
  expect(
    affordancesOf(def.meta, withAssignees, "t1")
      .filter(({ part }) => part === "assign")
      .map(({ address }) => address),
  ).toEqual(["t1/r1/assign"]);
});

it("requires gate acceptance refs and keeps planned dates distinct from derived state", () => {
  const def = components.Milestones;
  const example = def.examples[0]!;
  const gate = example.gates[0]!;
  for (const gates of [
    [],
    [{ ...gate, requires: [] }],
    [{ ...gate, reached: true }],
    [{ ...gate, due: "2026-11-31" }],
  ])
    expect(def.props.safeParse({ ...example, gates }).success).toBe(false);
});

it("preserves full scheduled dates while enforcing inclusive range and dependency bounds", () => {
  const def = components.Gantt;
  const example = def.examples[0]!;
  const [first, second] = example.tasks;
  expect(def.props.safeParse({ ...example, to: "2027-02-13" }).success).toBe(true); // 90 days
  for (const updates of [
    { to: "2027-02-14" },
    { to: "2026-11-21" },
    { tasks: [{ ...first, end: "2026-11-15" }] },
    { tasks: [{ ...first, after: [second!.taskRef] }, second] },
    { gates: Array(7).fill(example.gates[0]) },
  ])
    expect(def.props.safeParse({ ...example, ...updates }).success).toBe(false);
  expect(readComponent(def, def.examples[1], "g1").join("\n")).toContain("2026-10-29");
});

it("checks time entries by actual instants and requires valid week, timer target and compact day", () => {
  const def = components.TimeLog;
  const example = def.examples[0]!;
  const entry = example.entries[0]!;
  for (const updates of [
    { week: "2026-11-17" },
    { projectRef: undefined },
    { day: "2026-11-16" },
    { style: "single_day" },
    {
      entries: [
        { ...entry, end: "2026-11-16T08:15:00Z" },
        { ...entry, start: "2026-11-16T08:10:00Z" },
      ],
    },
    { entries: [{ ...entry, end: "2026-11-16T07:59:00Z" }] },
    { entries: [{ ...entry, start: "2026-11-16T09:00:00" }] },
    { entries: [{ ...entry, end: "2026-11-23T00:01:00Z" }] },
  ])
    expect(def.props.safeParse({ ...example, ...updates }).success).toBe(false);
  expect(
    def.props.safeParse({ ...example, entries: [{ ...entry, end: "2026-11-23T00:00:00Z" }] }).success,
  ).toBe(true);
  expect(def.meta.partTiers.export).toBe("service");
  expect(def.meta.confirmParts).toContain("remove");
  const brief = def.examples[1]!;
  expect(def.props.parse(brief).entries[0]?.note).toBe(brief.entries[0]?.note);
  expect(readComponent(def, brief, "t1").join("\n")).not.toContain(brief.entries[0]!.note!);
});

it("requires testable, distinct deliverables with bounded revisions, and confirms both changes", () => {
  const def = components.Scope;
  const example = def.examples[0]!;
  const deliverable = example.deliverables[0]!;
  for (const updates of [
    { revision: 100 },
    { deliverables: [] },
    { deliverables: [deliverable, deliverable] },
    { deliverables: [{ ...deliverable, acceptance: "" }] },
    { excluded: ["a".repeat(61)] },
  ])
    expect(def.props.safeParse({ ...example, ...updates }).success).toBe(false);
  expect(def.meta.confirmParts).toEqual(expect.arrayContaining(["accept", "remove"]));
});

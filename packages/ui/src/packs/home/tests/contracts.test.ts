import { selectedIds, selectedEntries } from "../../../../scripts/build";
import { expect, it } from "vitest";
import { components, packOf, placeholderTitle, type CastLike, type Definition } from "@lmthing/ui/catalog";

const defs = Object.values(components).filter(
  (def) => (packOf as Record<string, string>)[def.meta.id] === "home",
) as Definition[];
const casts: CastLike[] = [
  { things: [], items: [] },
  {
    things: [{ type: "plant", fields: ["name", "room"] }],
    items: [{ id: "fern", type: "plant", sample: true, name: "Fern", room: "Bathroom" }],
  },
  {
    things: [{ type: "dog", fields: ["name", "owner"] }],
    items: [{ id: "clover", type: "dog", sample: true, name: "Clover", owner: "Sam" }],
  },
  {
    things: [{ type: "plant", fields: ["name"] }],
    items: Array.from({ length: 15 }, (_, i) => ({
      id: `plant_${i}`,
      type: "plant",
      sample: false,
      name: "x".repeat(80),
    })),
  },
  {
    things: [{ type: "plant", fields: ["name", "room"] }],
    items: [{ id: "bad id", type: "plant", sample: true, name: 4, room: null }],
  },
];

it("accepts examples, bounded neutral/matching/malformed cast fallbacks and full metadata", () => {
  expect(defs).toHaveLength(9);
  for (const def of defs.filter((def) => selectedIds([def.meta.id]).length)) {
    expect(def.examples.length).toBeGreaterThanOrEqual(2);
    for (const example of def.examples) expect(def.props.safeParse(example).success).toBe(true);
    for (const cast of casts) expect(def.props.safeParse(def.fallback({ cast })).success).toBe(true);
    expect(def.meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(def.meta.realPath).not.toBe("");
    expect(def.meta.states).toContain("filled");
    expect(def.meta.parts).toContain("root");
    const probes = def.probes;
    expect(probes.filter((probe) => probe.kind === "choose").length).toBeGreaterThanOrEqual(2);
    expect(
      probes.some(
        (probe) => probe.kind === "choose" && probe.expect !== def.meta.id && !(probe.expect in packOf),
      ),
    ).toBe(true);
    expect(probes.some((probe) => probe.kind === "write" && probe.expect === def.meta.id)).toBe(true);
    expect(probes.some((probe) => probe.kind === "read")).toBe(true);
    expect(def.props.safeParse({ ...(def.examples[0] as object), color: "red" }).success).toBe(false);
  }
  expect(components.Chores.fallback({ cast: casts[0]! }).chores[0]?.title).toBe(placeholderTitle(0));
  expect(components.CareSchedule.fallback({ cast: casts[1]! }).tasks[0]?.title).toBe("Fern");
  expect(components.Devices.fallback({ cast: casts[0]! }).rooms[0]?.devices[0]?.name).toBe(
    placeholderTitle(0),
  );
});

const invalid: Record<string, unknown[]> = {
  Chores: [
    { chores: [] },
    { chores: [{ title: "x".repeat(29), who: "Sam", repeat: "weekly", every: 1, goto: "detail" }] },
    { chores: [{ ...components.Chores.examples[0]!.chores[0], every: 13 }] },
    { chores: [{ ...components.Chores.examples[0]!.chores[0], last: "2026-02-30" }] },
    { chores: [{ ...components.Chores.examples[0]!.chores[0], points: 101 }] },
    { chores: [{ ...components.Chores.examples[0]!.chores[0], next: "2026-11-20" }] },
    { chores: Array.from({ length: 7 }, () => components.Chores.examples[0]!.chores[0]) },
  ],
  Rewards: [
    { ...components.Rewards.examples[0], kids: [] },
    { ...components.Rewards.examples[0], prizes: [] },
    {
      ...components.Rewards.examples[0],
      kids: Array.from({ length: 5 }, () => components.Rewards.examples[0]!.kids[0]),
    },
    { ...components.Rewards.examples[0], prizes: [{ title: "x".repeat(25), cost: 2, icon: "star" }] },
    { ...components.Rewards.examples[0], entries: [] },
  ],
  CareSchedule: [
    { tasks: [] },
    { tasks: Array.from({ length: 13 }, () => components.CareSchedule.examples[0]!.tasks[0]) },
    { tasks: [{ ...components.CareSchedule.examples[0]!.tasks[0], repeat: "fortnightly" }] },
    { tasks: [{ ...components.CareSchedule.examples[0]!.tasks[0], overdue: true }] },
  ],
  Turns: [
    { job: "Dishes", people: [{ name: "Sam" }], at: 0 },
    { job: "Dishes", people: [{ name: "Sam" }, { name: "Alex" }], at: 2 },
    { ...components.Turns.examples[0], at: -1 },
  ],
  Agenda: [
    { days: [], goto: "add_event" },
    { days: [{ date: "2026-11-20", events: [] }], goto: "add_event" },
    {
      days: [{ date: "2026-11-20", events: [{ title: "Walk", who: [], time: "24:00" }] }],
      goto: "add_event",
    },
    { ...components.Agenda.examples[0], conflicts: true },
  ],
  BabyLog: [
    { log: [{ kind: "feed", time: "07:00" }], running: "none" },
    { log: [{ kind: "sleep", time: "07:00", minutes: -1 }], running: "none" },
    { log: [{ kind: "bottle", time: "07:00", amount: "x".repeat(11) }], running: "none" },
    { log: Array.from({ length: 13 }, () => ({ kind: "sleep", time: "07:00" })), running: "none" },
    { log: [], running: true },
  ],
};
it("rejects contract limits, derived fields and vocabulary violations", () => {
  for (const [id, inputs] of selectedEntries(invalid))
    for (const input of inputs)
      expect((components as Record<string, Definition>)[id]!.props.safeParse(input).success).toBe(false);
});

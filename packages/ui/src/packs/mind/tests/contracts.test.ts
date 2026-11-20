import { describe, expect, it } from "vitest";
import {
  components,
  createRegistry,
  placeholderTitle,
  readComponent,
  type CastLike,
  type Definition,
} from "@lmthing/ui/catalog";

const { Entries, Factors, Feelings, Breathe, SleepLog, Soundscape, Patterns } = components;
const defs = { Entries, Factors, Feelings, Breathe, SleepLog, Soundscape, Patterns } satisfies Record<
  string,
  Definition
>;
const empty: CastLike = { things: [], items: [] };
const populated: CastLike = {
  things: [{ type: "record", fields: ["first", "second"] }],
  items: [{ id: "sample", type: "record", sample: true, first: "Known title", second: "2026-11-20" }],
};
const malformed: CastLike = {
  ...populated,
  items: [{ id: "not valid", type: "record", sample: true, first: 7, second: " ".repeat(12) }],
};

describe.each(Object.entries<Definition>(defs))("%s contract", (id, def) => {
  it("accepts examples and all cast fallbacks without accepting unknown props", () => {
    expect(def.examples.length).toBeGreaterThanOrEqual(2);
    for (const example of def.examples) {
      expect(def.props.safeParse(example).success).toBe(true);
      expect(def.props.safeParse({ ...(example as object), color: "red" }).success).toBe(false);
    }
    for (const cast of [empty, populated, malformed]) {
      expect(def.props.safeParse(def.fallback({ cast })).success).toBe(true);
    }
  });

  it("has meaningful metadata and probes that resolve to valid read addresses", () => {
    expect(def.meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(def.meta.realPath).not.toBe("");
    expect(def.meta.tier).toBe("phone");
    expect(def.meta.variants).toBeDefined();
    const core = createRegistry();
    expect(def.probes.some((probe) => probe.kind === "choose" && probe.expect === id)).toBe(true);
    expect(
      def.probes.some(
        (probe) => probe.kind === "choose" && core.ids.includes(probe.expect as (typeof core.ids)[number]),
      ),
    ).toBe(true);
    expect(def.probes).toContainEqual(expect.objectContaining({ kind: "write", expect: id }));
    const reads = def.probes.filter((probe) => probe.kind === "read");
    if (def.meta.actions) expect(reads.length).toBeGreaterThan(0);
    for (const { screen, expect: target } of reads) {
      const instance = target.address.split("/")[0]!;
      const text = readComponent(def, def.examples[screen], instance).join("\n");
      expect(text).toContain(`[${target.address} ${target.action}`);
    }
  });
});

it("seeds labels from the cast or shared neutral placeholders", () => {
  expect(Entries.fallback({ cast: populated }).entries[0]).toMatchObject({
    text: "Known title",
    date: "2026-11-20",
    goto: "sample",
  });
  expect(Factors.fallback({ cast: populated }).items[0]?.label).toBe("Known title");
  expect(Feelings.fallback({ cast: populated }).families[0]?.label).toBe("Known title");
  expect(Soundscape.fallback({ cast: populated }).sounds[0]?.label).toBe("Known title");
  expect(Patterns.fallback({ cast: populated }).factors).toEqual(["Known title"]);
  expect(Factors.fallback({ cast: empty }).items[0]?.label).toBe(placeholderTitle(0));
  expect(Patterns.fallback({ cast: empty }).factors).toEqual([placeholderTitle(0)]);
});

it("bounds entries, dates, excerpts, tags and mood, and reads in descending date order", () => {
  const first = Entries.examples[0]!.entries[0]!;
  const older = { ...first, date: "2026-10-01" };
  expect(Entries.props.parse({ entries: [older, first] }).entries.map(({ date }) => date)).toEqual([
    first.date,
    older.date,
  ]);
  for (const entries of [
    [],
    Array(7).fill(first),
    [{ ...first, date: "2026-02-30" }],
    [{ ...first, mood: 0 }],
    [{ ...first, mood: 6 }],
    [{ ...first, text: "a".repeat(161) }],
    [{ ...first, tags: ["a", "b", "c", "d"] }],
    [{ ...first, tags: ["a".repeat(13)] }],
    [{ ...first, photo: "https://example.org/a.png" }],
    [{ ...first, goto: "bad id" }],
  ])
    expect(Entries.props.safeParse({ entries }).success).toBe(false);
});

it("keeps factor tiles and feeling selections within their limits", () => {
  const factor = Factors.examples[0]!.items[0]!;
  expect(Factors.props.safeParse({ items: Array(16).fill(factor) }).success).toBe(true);
  for (const items of [
    Array(3).fill(factor),
    Array(17).fill(factor),
    Array(4).fill({ ...factor, label: "a".repeat(15) }),
    Array(4).fill({ ...factor, icon: "unknown" }),
  ])
    expect(Factors.props.safeParse({ items }).success).toBe(false);
  const { families } = Feelings.examples[0]!;
  for (const input of [
    { families: families.slice(1), chosen: [] },
    { families: Array(7).fill(families[0]), chosen: [] },
    { families: [{ label: "Calm", words: ["One", "Two"] }, ...families.slice(1)], chosen: [] },
    { families: [{ label: "Calm", words: Array(9).fill("One") }, ...families.slice(1)], chosen: [] },
    { families, chosen: ["Settled", "Hopeful", "Restless", "Worried"] },
    { families, chosen: ["Settled", "Settled"] },
    { families, chosen: ["Unknown"] },
  ])
    expect(Feelings.props.safeParse(input).success).toBe(false);
});

it("limits custom breathing to four phase durations and validates rounds", () => {
  const custom = { pattern: "custom", rounds: 20, inhale: 10, hold: 0, exhale: 10, rest: 0 };
  expect(Breathe.props.safeParse(custom).success).toBe(true);
  for (const pattern of ["box", "calm", "even"]) {
    expect(Breathe.props.safeParse({ pattern, rounds: 1 }).success).toBe(true);
    expect(Breathe.props.safeParse({ ...custom, pattern }).success).toBe(false);
  }
  for (const input of [
    { ...custom, rest: undefined },
    { ...custom, inhale: 0, exhale: 0 },
    { ...custom, inhale: 11 },
    { ...custom, rounds: 21 },
    { ...custom, rounds: 0 },
  ])
    expect(Breathe.props.safeParse(input).success).toBe(false);
});

it("computes midnight-crossing sleep and weekly averages without accepting derived totals", () => {
  const example = SleepLog.examples[0]!;
  const reading = readComponent(SleepLog, example, "s1").join("\n");
  expect(reading).toContain("450 min");
  expect(reading).toContain("441 min");
  expect(reading).toContain('"Edit sleep times"');
  expect(SleepLog.meta.partTiers).toMatchObject({ import: "ok" });
  expect(readComponent(SleepLog, example, "s1", "empty").join("\n")).toContain("[s1/edit press");
  for (const invalid of [
    { bed: "24:00" },
    { awake: 481 },
    { quality: 6 },
    { week: [7] },
    { week: [7, 7, 7, 25, 7, 7, 7] },
    { hours: 7.5 },
    { average: 7.35 },
  ])
    expect(SleepLog.props.safeParse({ ...example, ...invalid }).success).toBe(false);
});

it("bounds sound controls and permits only inputs for computed patterns", () => {
  const { sounds } = Soundscape.examples[0]!;
  for (const input of [
    { sounds: sounds.slice(0, 1), timer: 0 },
    { sounds: Array(7).fill(sounds[0]), timer: 0 },
    { sounds: [{ ...sounds[0], level: 11 }, sounds[1]], timer: 0 },
    { sounds, timer: 121 },
  ])
    expect(Soundscape.props.safeParse(input).success).toBe(false);
  expect(Patterns.props.parse({ factors: ["Outdoors"] }).minDays).toBe(14);
  for (const input of [
    { factors: [] },
    { factors: Array(5).fill("Outdoors") },
    { factors: ["a".repeat(15)] },
    { factors: ["Outdoors"], minDays: 13 },
    { factors: ["Outdoors"], minDays: 61 },
    { factors: ["Outdoors"], findings: [] },
  ])
    expect(Patterns.props.safeParse(input).success).toBe(false);
});

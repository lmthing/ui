import { expect, it, vi } from "vitest";
import { affordancesOf, components, stampItemIds } from "@lmthing/ui/catalog";
import { indexedActions, indexedParts, indexedValues, indexedWhen, seedTitles } from "..";

it("gets bounded cast titles by declared fields and shared empty placeholders", () => {
  expect(seedTitles({ things: [], items: [] }, 2, 16)).toEqual(["Item one", "Item two"]);
  expect(
    seedTitles(
      {
        things: [{ type: "record", fields: ["custom"] }],
        items: [
          { id: "one", type: "record", sample: true, custom: "Long title to be clipped" },
          { id: "two", type: "other", sample: true, custom: "Ignore" },
        ],
      },
      2,
      10,
    ),
  ).toEqual(["Long title"]);
});

it("projects bounded named parts and conditions without changing Writer input contracts", () => {
  expect(indexedParts(2, ["done"])).toEqual(["done_1", "done_2"]);
  expect(indexedActions(2, { done: ["check"] })).toEqual({ done_1: ["check"], done_2: ["check"] });
  expect(indexedWhen(2, ["done"])).toEqual({ done_1: { has_1: true }, done_2: { has_2: true } });
  expect(indexedValues([{ done: false }], 2, ["done"])).toEqual({
    has_1: true,
    done_1: false,
    has_2: false,
    done_2: undefined,
  });
});

it("offers only existing sets and reads each set's own done mark, including timed-only inputs", () => {
  const def = components.Workout;
  const input = { exercises: [{ name: "Timed hold", sets: [{ seconds: 45, done: false }, { done: true }] }] };
  const parsed = stampItemIds(def.meta, def.props.parse(input));
  const actions = affordancesOf(def.meta, parsed, "w1");
  expect(actions.find((a) => a.address === "w1/r1/done_1")?.detail).toBe(":todo");
  expect(actions.find((a) => a.address === "w1/r1/done_2")?.detail).toBe(":done");
  expect(actions.some((a) => a.address === "w1/r1/weight_1")).toBe(true);
  expect(actions.some((a) => a.address === "w1/r1/done_3")).toBe(false);
  expect(def.props.safeParse({ exercises: [{ ...input.exercises[0], has_1: true }] }).success).toBe(false);
});

it("offers only symptoms that exist and reads each chip's own toggle state", () => {
  const def = components.SymptomLog;
  const parsed = stampItemIds(def.meta, def.props.parse(def.examples[0]));
  const actions = affordancesOf(def.meta, parsed, "s1");
  expect(actions.find((a) => a.address === "s1/r1/symptom_1")?.detail).toBe(":on");
  expect(actions.find((a) => a.address === "s1/r1/symptom_2")?.detail).toBe(":off");
  expect(actions.some((a) => a.address === "s1/r1/symptom_3")).toBe(false);
});

it("reads individual weekday marks and disables future days", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-19T12:00:00"));
  try {
    const def = components.HabitGrid;
    const parsed = stampItemIds(def.meta, def.props.parse(def.examples[0]));
    const actions = affordancesOf(def.meta, parsed, "h1");
    expect(actions.find((a) => a.address === "h1/r1/day_1")?.detail).toBe(":todo");
    expect(actions.find((a) => a.address === "h1/r1/day_2")?.detail).toBe(":done");
    expect(actions.some((a) => a.address === "h1/r1/day_4")).toBe(true);
    expect(actions.some((a) => a.address === "h1/r1/day_5")).toBe(false);
  } finally {
    vi.useRealTimers();
  }
});

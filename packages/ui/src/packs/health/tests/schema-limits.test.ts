import { expect, it } from "vitest";
import { components, type Definition } from "@lmthing/ui/catalog";

type Limit = { id: string; path: string; min: number; max: number; kind: "text" | "array" | "number" };
const textLimits = {
  Workout: { "exercises.0.name": 28 },
  Exercise: { name: 28, "muscles.0": 16, "cues.0": 60, equipment: 20, best: 16, last: 16 },
  Measurements: { label: 20, unit: 8 },
  Medication: { "doses.0.name": 24, "doses.0.dose": 16 },
  HabitGrid: { "habits.0.name": 20 },
  Vitals: { "readings.0.label": 20, "readings.0.unit": 8, "readings.0.at": 12 },
  SymptomLog: { "groups.0.label": 16, "groups.0.symptoms.0.label": 16 },
  ActivityRings: { "rings.0.label": 16, "rings.0.unit": 8 },
};
const arrayLimits = {
  Workout: { exercises: [1, 8], "exercises.0.sets": [1, 6] },
  Exercise: { muscles: [1, 3], cues: [1, 3] },
  Measurements: { points: [4, 52] },
  Medication: { doses: [1, 8] },
  HabitGrid: { habits: [1, 6], "habits.0.days": [7, 7] },
  Vitals: { readings: [1, 4] },
  SymptomLog: { groups: [1, 4], "groups.0.symptoms": [2, 8] },
  ActivityRings: { rings: [2, 3] },
};
const numberLimits = {
  Workout: {
    rest: [0, 600],
    "exercises.0.sets.0.weight": [0, 1000],
    "exercises.0.sets.0.reps": [0, 999],
    "exercises.0.sets.0.seconds": [0, 86400],
  },
  Measurements: { "points.0": [0, 10000], goal: [0, 10000] },
  Medication: { "doses.0.left": [0, 10000], refillAt: [0, 10000] },
  Vitals: { "readings.0.value": [-1000000, 1000000], "readings.0.value2": [-1000000, 1000000] },
  SymptomLog: { "groups.0.symptoms.0.severity": [0, 5] },
  Cycle: { length: [21, 40], period: [2, 10] },
  ActivityRings: { "rings.0.value": [0, 1000000], "rings.0.of": [1, 1000000] },
};
const defs = components as Record<string, Definition>;
function limits(table: Record<string, Record<string, number | number[]>>, kind: Limit["kind"]): Limit[] {
  return Object.entries(table).flatMap(([id, fields]) =>
    Object.entries(fields).map(([path, bound]) => ({
      id,
      path,
      kind,
      min: typeof bound === "number" ? 1 : bound[0]!,
      max: typeof bound === "number" ? bound : bound[1]!,
    })),
  );
}
function valueAt(input: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], input);
}
function replace(input: unknown, path: string, value: unknown): unknown {
  const output = structuredClone(input);
  const keys = path.split(".");
  const holder = keys
    .slice(0, -1)
    .reduce<unknown>((item, key) => (item as Record<string, unknown>)[key], output);
  (holder as Record<string, unknown>)[keys.at(-1)!] = value;
  return output;
}
const cases = [
  ...limits(textLimits, "text"),
  ...limits(arrayLimits, "array"),
  ...limits(numberLimits, "number"),
];
it.each(cases)("$id $path honors its exact $kind limits", ({ id, path, kind, min, max }) => {
  const def = defs[id]!;
  const seed = def.examples[0];
  const value = (size: number) =>
    kind === "text"
      ? "a".repeat(size)
      : kind === "number"
        ? size
        : Array.from({ length: size }, () => (valueAt(seed, path) as unknown[])[0]);
  for (const boundary of [min, max])
    expect(def.props.safeParse(replace(seed, path, value(boundary))).success).toBe(true);
  for (const boundary of [min - 1, max + 1])
    expect(def.props.safeParse(replace(seed, path, value(boundary))).success).toBe(false);
});
it.each(Object.keys(numberLimits))("%s rejects nonfinite numeric input", (id) => {
  const path = Object.keys(numberLimits[id as keyof typeof numberLimits])[0]!;
  for (const value of [NaN, Infinity, -Infinity])
    expect(defs[id]!.props.safeParse(replace(defs[id]!.examples[0], path, value)).success).toBe(false);
});
it.each([
  "Workout",
  "Exercise",
  "Measurements",
  "Medication",
  "HabitGrid",
  "Vitals",
  "SymptomLog",
  "Cycle",
  "ActivityRings",
])("%s rejects missing fields and presentation keys", (id) => {
  const def = defs[id]!;
  expect(def.props.safeParse({}).success).toBe(false);
  expect(def.props.safeParse({ ...(def.examples[0] as object), color: "#ffffff" }).success).toBe(false);
});
it.each([
  ["Workout", "unit", "stone"],
  ["Measurements", "range", "week"],
  ["Medication", "doses.0.status", "missed"],
  ["HabitGrid", "habits.0.icon", "unknown"],
  ["Exercise", "photo", "https://example.com/photo"],
  ["Vitals", "goto", "Bad ID"],
  ["Cycle", "start", "2026-02-30"],
])("%s rejects an invalid vocabulary or reference at %s", (id, path, value) => {
  const def = defs[id]!;
  expect(def.props.safeParse(replace(def.examples[0], path, value)).success).toBe(false);
});
it("rejects invalid clocks, unordered reference bounds and fractional count inputs", () => {
  expect(
    components.Medication.props.safeParse(replace(components.Medication.examples[0], "doses.0.time", "25:00"))
      .success,
  ).toBe(false);
  expect(
    components.Vitals.props.safeParse(replace(components.Vitals.examples[0], "readings.0.low", 121)).success,
  ).toBe(false);
  for (const [id, path] of [
    ["Workout", "rest"],
    ["Cycle", "length"],
    ["SymptomLog", "groups.0.symptoms.0.severity"],
  ])
    expect(defs[id!]!.props.safeParse(replace(defs[id!]!.examples[0], path!, 2.5)).success).toBe(false);
  expect(
    components.ActivityRings.props.safeParse(replace(components.ActivityRings.examples[0], "rings.0.of", 0))
      .success,
  ).toBe(false);
});

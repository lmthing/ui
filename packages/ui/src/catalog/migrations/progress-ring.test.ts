import { expect, it } from "vitest";
import { migrateRingV1 } from "./progress-ring";

const goal = { label: "A".repeat(24), value: 8, of: 5 };
const legacy = { id: "r7", c: "Ring", ...goal } as const;

it.each([
  ["md", {}, {}],
  ["lg", {}, { emphasis: "hero" }],
  ["lg", { emphasis: "normal" }, { emphasis: "normal" }],
  ["lg", { emphasis: null }, { emphasis: "hero" }],
  [null, { emphasis: "hero" }, { emphasis: "hero" }],
] as const)("normalizes legacy style %s before rewriting the goal", (style, axes, expected) => {
  const input = Object.freeze({ ...legacy, style, ...axes });
  const migrated = migrateRingV1(input);
  expect(migrated).toStrictEqual({
    id: "r7",
    c: "Progress",
    style: "ring",
    bars: [goal],
    ...expected,
  });
  const reloaded = JSON.parse(JSON.stringify(migrated));
  expect(migrateRingV1(reloaded)).toBe(reloaded);
  expect(input).toEqual({ ...legacy, style, ...axes });
});

it("keeps the component id, explicit state, finish, and hidden caption without adding a row action", () => {
  const saved = {
    ...legacy,
    c: "r-i-n-g",
    value: 0,
    of: 0.5,
    style: "lg",
    density: "compact",
    detail: "brief",
    sub: "Two to go",
    state: "loading",
  };
  expect(migrateRingV1(saved)).toStrictEqual({
    id: "r7",
    c: "Progress",
    style: "ring",
    bars: [{ label: goal.label, value: 0, of: 0.5 }],
    density: "compact",
    emphasis: "hero",
    detail: "brief",
    sub: "Two to go",
    state: "loading",
  });
});

it("removes absent optional inputs without affecting unrelated lines", () => {
  const expected = { id: "r7", c: "Progress", style: "ring", bars: [goal] };
  expect(migrateRingV1({ ...legacy, density: null, sub: null, detail: null })).toStrictEqual(expected);
  for (const line of [
    { ...legacy, c: "ActivityRings" },
    { ...legacy, style: "future" },
    { c: "Progress", id: "p1", bars: [{ ...goal, goto: "details" }] },
  ]) {
    expect(migrateRingV1(line)).toBe(line);
  }
});

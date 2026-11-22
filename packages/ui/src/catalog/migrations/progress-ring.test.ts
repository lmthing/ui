import { expect, it } from "vitest";
import {
  checkScreen,
  components,
  migrateJSONL,
  migrateScreen,
  planAct,
  readScreen,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
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

it("keeps the component id, explicit state, emphasis and hidden caption without adding a row action", () => {
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

const bars = { id: "p1", c: "Progress", bars: [goal, { label: "Details", value: 1, of: 2, goto: "more" }] };
const screen = {
  id: "goals",
  components: [
    { id: "h1", c: "Header", title: "Goals" },
    { ...legacy, style: "lg", detail: "brief", sub: "Private caption" },
    { ...bars, bars: [{ ...goal, label: "Training" }, bars.bars[1]!] },
  ],
};

it("reloads adjacent legacy goals and a linked bar without changing positions, weight or addresses", () => {
  const canonical = migrateScreen(screen);
  expect(migrateJSONL(JSON.stringify(screen))).toEqual(JSON.stringify(canonical));
  expect(migrateScreen(JSON.parse(JSON.stringify(canonical)))).toEqual(canonical);
  expect(canonical.components.map(({ id, c }) => [id, c])).toEqual([
    ["h1", "Header"],
    ["r7", "Progress"],
    ["p1", "Progress"],
  ]);
  expect(checkScreen(canonical, components)).toEqual([]);
  expect(checkScreen(screen, components)).toEqual([
    expect.objectContaining({ code: "S.unknown_component", address: "goals/r7/root" }),
  ]);
  const read = readScreen(screen, components);
  expect(read).toContain(`r7 Progress[ring] 8 of 5 — "${goal.label}"`);
  expect(read).not.toMatch(/Private caption|r7\/r1/);
  expect(read).toContain("[p1/r2 press→more]");
  expect(planAct(screen, components, {}, [{ address: "r7/ring", action: "press" }])).toMatchObject({
    ok: false,
    code: "not_actionable",
  });
  expect(planAct(screen, components, {}, [{ address: "p1/r2", action: "press" }])).toMatchObject({
    ok: true,
    links: [{ goto: "more", address: "goals/p1/r2" }],
  });
});

it("reads and acts against a mounted controller retaining the saved legacy instance IDs", () => {
  const controller = createScreenController({ screen, defs: components });
  try {
    expect(controller.read()).toContain("r7 Progress[ring] 8 of 5");
    expect(controller.act({ address: "p1/r2", action: "press" }, { dryRun: true })).toMatchObject({
      ok: true,
    });
    expect(controller.act({ address: "r7/ring", action: "press" })).toMatchObject({ ok: false });
  } finally {
    controller.dispose();
  }
});

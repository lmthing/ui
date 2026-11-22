import { expect, it, vi } from "vitest";
import { components, readComponent, type StateName } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderExample, renderInstance } from "../../../../../test/render";
import { SavedViews } from "../../components";

const { examples, fallback, probes, props } = SavedViews;

const cast = { things: [], items: [] };
const valid = fallback({ cast });
const invalid: unknown[] = [
  { ...valid, unknown: "invalid" },
  { ...valid, views: [] },
  { ...valid, views: Array.from({ length: 7 }, () => ({ id: "x", label: "x" })) },
  { ...valid, activeId: "x".repeat(25) },
  { ...valid, activeId: "missing" },
  { ...valid, style: "not-a-choice!" },
  { ...valid, views: [valid.views[0], valid.views[0]] },
  ...[
    { id: "x".repeat(25) },
    { label: "x".repeat(21) },
    { summary: "x".repeat(37) },
    { layout: "masonry" },
    { count: 5 },
    { viewId: "fake" },
  ].map((change) => ({ ...valid, views: [{ ...valid.views[0], ...change }] })),
];

it.each(examples)("accepts a real example", (example) => {
  expect(props.safeParse(example).success).toBe(true);
});

it("defaults to save and chips and accepts six distinct views at the text limits", () => {
  const views = Array.from({ length: 6 }, (_, i) => ({
    id: "x".repeat(23) + i,
    label: "y".repeat(20),
    summary: "z".repeat(36),
  }));
  expect(props.parse({ views, activeId: views[5]?.id })).toMatchObject({ canSave: true, style: "chips" });
});

it.each(invalid)("rejects invalid input", (input) => {
  expect(props.safeParse(input).success).toBe(false);
});

it("validates the fallback for empty and populated casts", () => {
  expect(props.safeParse(fallback({ cast })).success).toBe(true);
  expect(valid.views).toEqual([{ id: "view_1", label: "Item one" }]);
  const things = [{ type: "item", fields: ["name"] }];
  const items = [{ id: "one", type: "item", name: "Sample", sample: true }];
  for (const name of ["Sample", 42]) {
    expect(
      props.safeParse(fallback({ cast: { things, items: items.map((item) => ({ ...item, name })) } }))
        .success,
    ).toBe(true);
  }
  expect(fallback({ cast: { things, items } }).views[0]?.label).toBe("Sample");
});

it("declares the core near miss, brief write and all read controls", () => {
  expect(probes[1]).toMatchObject({ kind: "choose", expect: "FilterBar" });
  expect(probes[3]).toMatchObject({ kind: "write", variant: { axis: "detail", value: "brief" } });
  expect(probes.slice(4).map((probe) => probe.kind)).toEqual(["read", "read", "read"]);
});

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const list = examples[0]!;
const chips = examples[1]!;
const at = (part: string) => `home/s1/${part}`;
const def = components.SavedViews;
const confirm = { address: "home/confirm/confirm", action: "press" };
const cancel = { address: "home/confirm/cancel", action: "dismiss" };

it("draws the active radio and count, and keeps list descriptions and removal out of chips", () => {
  const { html } = renderExample("SavedViews", chips, "filled", theme, { component: "s1" });
  const parts = addressedElements(html);
  expect(parts.get(at("r2/root"))?.attributes).toContain('aria-checked="true"');
  expect(parts.get(at("r2/label"))?.text).toEqual(["This week · 16"]);
  expect(parts.has(at("r2/remove"))).toBe(false);
  const chipsRead = readComponent(def, { ...list, style: "chips" }, "s1").join("\n");
  for (const hidden of ["/remove", '"needs_water"', "Due today, soonest first", "Cards layout"])
    expect(chipsRead).not.toContain(hidden);
  const full = addressedElements(
    renderExample("SavedViews", list, "filled", theme, { component: "s1" }).html,
  );
  expect(full.get(at("r2/summary"))?.text).toEqual(["Due today, soonest first"]);
  expect(full.get(at("r2/layout"))?.text).toEqual(["Cards layout"]);
  expect(full.get(at("r2/count"))?.text).toEqual(["16 matches"]);
  expect(full.get(at("r2/remove"))?.attributes).toContain('aria-label="Remove Needs water"');
  const brief = addressedElements(
    renderInstance("SavedViews", { ...list, detail: "brief" }, "filled", theme, { component: "s1" }),
  );
  for (const part of ["summary", "layout"]) expect(brief.has(at(`r2/${part}`))).toBe(false);
  const briefRead = readComponent(def, { ...list, detail: "brief" }, "s1").join("\n");
  expect(briefRead).not.toContain("Due today, soonest first");
  expect(briefRead).not.toContain("Cards layout");
});

it.each(["empty", "loading", "success"] as const)(
  "draws %s and advertises only its available actions",
  (state) => {
    const html = renderInstance("SavedViews", list, state, theme, { component: "s1" });
    const reading = readComponent(def, list, "s1", state).join("\n");
    expect(html).toContain('data-testid="home/s1/root"');
    expect(reading.includes("[s1/save press]")).toBe(state !== "loading");
    expect(reading.includes("[s1/r2/remove press]")).toBe(state === "success");
    if (state === "success") expect(html).toContain("Saved views updated");
    if (state !== "success") expect(html).not.toContain('aria-label="Remove Needs water" role="button"');
  },
);

function runtime(input: object, state: StateName = "filled", onAction = vi.fn()) {
  const screen = { id: "home", components: [{ ...input, id: "s1", c: "SavedViews", state }] };
  return createScreenController({ screen, defs: components, onAction, requireMounted: false });
}

it("dispatches the selected preset address and a host save request without changing wire props", () => {
  const onAction = vi.fn();
  const controller = runtime(list, "filled", onAction);
  try {
    expect(controller.act({ address: at("r1"), action: "select", value: 1 }).ok).toBe(false);
    expect(controller.press(at("r1/root"))).toMatchObject({ ok: true });
    expect(controller.store.get(at("r1"))).toBe(true);
    expect(controller.store.get(at("r2"))).toBe(false);
    expect(onAction).toHaveBeenCalledWith({ address: at("r1"), action: "select" });
    expect(controller.act({ address: at("r3"), action: "select", value: 2 })).toMatchObject({
      ok: true,
    });
    expect(onAction).toHaveBeenCalledWith({ address: at("r3"), action: "select", value: 2 });
    expect(controller.press(at("save")).ok).toBe(true);
    expect(onAction).toHaveBeenCalledWith({ address: at("save"), action: "press" });
    expect(controller.snapshotScreen().components[0]).toMatchObject(list);
  } finally {
    controller.dispose();
  }
});

it("confirms removal, leaves the preset on cancellation, and never renumbers other presets", () => {
  const controller = runtime(list);
  try {
    expect(controller.press(at("r2/remove")).ok).toBe(true);
    expect(controller.confirmation).toMatchObject({ source: at("r2/remove") });
    expect(controller.act(cancel).ok).toBe(true);
    expect(controller.read()).toContain("Needs water");
    expect(controller.press(at("r2/remove")).ok).toBe(true);
    expect(controller.act(confirm).ok).toBe(true);
    expect(controller.read()).not.toContain("Needs water");
    expect(controller.read()).toContain("[s1/r3/remove press]");
    expect(controller.press(at("r2/remove")).ok).toBe(false);
    expect(controller.act({ address: at("r3"), action: "select", value: 2 }).ok).toBe(true);
    expect(controller.read()).toContain("[s1/r3 select = 2]");
  } finally {
    controller.dispose();
  }
});

it("gates save when disabled or full and rejects removal from chips or noninteractive states", () => {
  const full = Array.from({ length: 6 }, (_, i) => ({ id: `view_${i}`, label: `View ${i}` }));
  for (const input of [{ ...chips, canSave: false }, { views: full }]) {
    expect(readComponent(def, input, "s1").join("\n")).not.toContain("[s1/save press]");
    expect(addressedElements(renderInstance("SavedViews", input, "filled", theme)).has("home/c1/save")).toBe(
      false,
    );
  }
  for (const [input, state] of [
    [chips, "filled"],
    [list, "empty"],
    [list, "loading"],
  ] as const) {
    const controller = runtime(input, state);
    try {
      expect(controller.press(at("r1/remove")).ok).toBe(false);
    } finally {
      controller.dispose();
    }
  }
});

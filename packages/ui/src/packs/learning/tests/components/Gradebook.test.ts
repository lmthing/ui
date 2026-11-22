import { describe, expect, it } from "vitest";
import { components, createRegistry, packReady, readComponent, type StateName } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { examples, props, meta, probes, fallback } = components.Gradebook;
const [filled, summary] = examples;
const empty = fallback({ cast: { things: [], items: [] } });
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const read = (input: unknown, state: StateName = "filled") =>
  readComponent(components.Gradebook, input, "g1", state).join("\n");
const draw = (input: unknown, state: StateName = "filled") =>
  renderInstance("Gradebook", input, state, theme);
const one = { label: "Labs", weight: 100, items: [{ title: "Lab report", earned: 9, possible: 10 }] };

describe("Gradebook contract", () => {
  it.each(examples)("parses a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("accepts maximum counts and bounded text; requires only raw records", () => {
    const category = {
      label: "L".repeat(24),
      items: Array(12).fill({ title: "T".repeat(28), possible: 0.5 }),
    };
    const categories = [0, 0.1, 19.9, 20, 30, 30].map((weight) => ({ ...category, weight }));
    expect(props.safeParse({ course: "C".repeat(32), term: "T".repeat(20), categories }).success).toBe(true);
  });
  it.each([
    { course: "x".repeat(33) },
    { term: "x".repeat(21) },
    { categories: [] },
    { categories: Array(7).fill({ ...one, weight: 100 / 7 }) },
    { categories: [{ ...one, items: Array(13).fill(one.items[0]) }] },
    { categories: [{ ...one, weight: 90 }] },
    { categories: [{ ...one, weight: -1 }] },
    { categories: [{ ...one, label: "L".repeat(25) }] },
    { categories: [{ ...one, items: [] }] },
    ...[
      { earned: -1 },
      { earned: 11 },
      { possible: 0 },
      { earned: Infinity },
      { date: "2026-02-30" },
      { title: "T".repeat(29) },
      { goto: "Bad link" },
      { id: "r1" },
    ].map((patch) => ({
      categories: [{ ...one, items: [{ ...one.items[0], ...patch }] }],
    })),
    { overall: 90 },
    { gpa: 4 },
    { color: "blue" },
    { style: "compact" },
  ])("rejects invalid patch %j", (patch) =>
    expect(props.safeParse({ ...filled, ...patch }).success).toBe(false),
  );
  it("uses the cast, but never invents earned scores", () => {
    const fromCast = fallback({
      cast: { things: [], items: [{ id: "lab", type: "record", title: "Workshop", sample: true }] },
    });
    expect(fromCast.course).toBe("Workshop");
    expect(empty.course).toBe("Item one");
    expect(fromCast.categories[0]?.items[0]?.earned).toBeUndefined();
    expect(props.safeParse(empty).success).toBe(true);
  });
  it("keeps core-first and variant probes and the live pack gate", () => {
    expect(meta.tier).toBe("phone");
    expect(meta.dense).toBe(true);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Stats" }));
    expect(probes).toContainEqual(expect.objectContaining({ variant: { axis: "detail", value: "brief" } }));
    expect(createRegistry({ packs: ["learning"] }).ids.includes("Gradebook")).toBe(packReady("learning"));
  });
});

describe("Gradebook parts and states", () => {
  it("draws the headline, first expanded category and its linked and unlinked rows", () => {
    const nodes = addressedElements(draw(filled));
    expect(nodes.get("home/c1/grade")?.text).toEqual(["88%"]);
    expect(nodes.get("home/c1/r1/root")?.attributes).toContain('aria-expanded="true"');
    expect(nodes.get("home/c1/r2/root")?.attributes).toContain('aria-expanded="false"');
    expect(nodes.get("home/c1/r1/item_1")?.attributes).toContain('role="link"');
    expect(nodes.get("home/c1/r1/item_2")?.attributes).not.toContain('role="link"');
    expect(nodes.has("home/c1/r2/item_1")).toBe(false);
    expect(nodes.has("home/c1/r1/item_1_date")).toBe(true);
  });
  it("keeps the grade in summary and removes only dates and term in brief", () => {
    expect(draw(summary)).toContain("4.00 GPA");
    expect(read(summary)).toContain("4.00 GPA");
    expect(read(summary)).toContain("Field assessment");
    expect(read(summary)).not.toMatch(/Practice walk|\[g1\/r/);
    const brief = { ...filled, detail: "brief" };
    const nodes = addressedElements(draw(brief));
    expect(nodes.has("home/c1/r1/item_1")).toBe(true);
    expect(nodes.has("home/c1/term")).toBe(false);
    expect(nodes.has("home/c1/r1/item_1_date")).toBe(false);
    expect(read(brief)).not.toMatch(/Autumn term|Oct/);
  });
  it("shows dedicated empty and error copy and a shaped inert loading state", () => {
    expect(draw(empty)).toContain("No graded coursework yet");
    expect(draw(filled, "empty")).toContain("No graded coursework yet");
    expect(draw(filled, "error")).toContain("Check category weights and scores.");
    expect(draw(filled, "loading")).toContain('aria-busy="true"');
    for (const state of ["empty", "error", "loading"] as const) {
      expect(addressedElements(draw(filled, state)).has("home/c1/r1/item_1")).toBe(false);
      expect(read(filled, state)).not.toContain("[g1/r");
    }
    expect(read(empty)).not.toContain("[g1/r");
  });
});

it("toggles categories independently and links only open coursework with a destination", () => {
  const linked: string[] = [];
  const controller = createScreenController({
    screen: { id: "home", components: [{ ...filled, id: "g1", c: "Gradebook" }] },
    defs: components,
    onLink: (goto) => {
      linked.push(goto);
    },
  });
  try {
    expect(controller.read()).toContain("Fern care plan · 18 / 20");
    expect(controller.read()).not.toContain("Light and humidity");
    expect(controller.press("g1/r1/item_1").ok).toBe(true);
    expect(linked).toEqual(["fern_plan"]);
    expect(controller.press("g1/r1/item_2").ok).toBe(false);
    expect(controller.press("g1/r2/item_1").ok).toBe(false);
    expect(controller.press("g1/r2").ok).toBe(true);
    expect(controller.read()).toContain("Light and humidity · 17 / 20");
    expect(controller.read()).toContain("Fern care plan");
    expect(controller.press("g1/r1").ok).toBe(true);
    expect(controller.read()).not.toContain("Fern care plan");
    expect(controller.press("g1/r1/item_1").ok).toBe(false);
    expect(controller.press("g1/r1").ok).toBe(true);
    expect(controller.press("g1/r1/item_1").ok).toBe(true);
  } finally {
    controller.dispose();
  }
});

import { describe, expect, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  readComponent,
  stampItemIds,
  type CastLike,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, renderInstance } from "../../../../../test/render";
import { visibleTexts } from "../../../../../test/variants";

const def = components.NutritionFacts;
const { props, meta, examples, fallback, probes } = def;
const input = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const render = (value: unknown, state: (typeof meta.states)[number] = "filled") =>
  renderInstance(meta.id, value, state, theme);

describe("NutritionFacts contract", () => {
  it.each(examples)("parses domain examples", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("defaults servings, trims text, and accepts the exact dense and text limits", () => {
    const nutrient = { label: "x".repeat(20), unit: "x".repeat(8), amount: 0 };
    expect(
      props.parse({
        ...input,
        title: ` ${"x".repeat(32)} `,
        servingLabel: "x".repeat(24),
        servings: undefined,
        nutrients: Array.from({ length: 8 }, () => nutrient),
        allergens: Array(6).fill("x".repeat(16)),
      }),
    ).toMatchObject({
      title: "x".repeat(32),
      servings: 1,
      detail: "full",
      surface: "card",
      nutrients: Array.from({ length: 8 }, () => ({ ...nutrient, tone: "neutral" })),
    });
    for (const servings of [0.25, 0.6, 12])
      expect(props.safeParse({ ...input, servings }).success).toBe(true);
  });
  it.each([
    { title: " ".repeat(6) },
    { title: "x".repeat(33) },
    { servingLabel: "x".repeat(25) },
    { servings: 0.24 },
    { servings: 12.01 },
    { servings: Infinity },
    { calories: -1 },
    { protein: -1 },
    { carbs: NaN },
    { fat: -1 },
    { allergens: Array(7).fill("Milk") },
    { allergens: ["x".repeat(17)] },
    { nutrients: Array(9).fill({ label: "Fiber", amount: 1, unit: "g" }) },
    ...[
      { label: "x".repeat(21) },
      { amount: -1 },
      { unit: "x".repeat(9) },
      { tone: "purple" },
      { id: "r1" },
      { color: "red" },
    ].map((extra) => ({ nutrients: [{ label: "Fiber", amount: 1, unit: "g", ...extra }] })),
    { rows: [] },
    { style: "compact" },
    { color: "red" },
    { density: "small" },
    { surface: "plain" },
    { detail: "compact" },
    { macroPercentages: [20, 50, 30] },
  ])("rejects invalid or presentation input", (override) =>
    expect(props.safeParse({ ...input, ...override }).success).toBe(false),
  );
});

describe("NutritionFacts fallback and probes", () => {
  const empty = { things: [], items: [] };
  const populated: CastLike = {
    things: [{ type: "record", fields: ["title", "detail"] }],
    items: [{ id: "r1", type: "record", sample: true, title: "Bowl", detail: "One portion" }],
  };
  it("uses neutral placeholders and supported cast fields, without inventing nutrition", () => {
    expect(fallback({ cast: empty })).toMatchObject({ title: "Item one", servingLabel: "Details" });
    expect(fallback({ cast: populated })).toMatchObject({
      title: "Bowl",
      servingLabel: "One portion",
      calories: 0,
      nutrients: [],
      allergens: [],
    });
    const malformed = { ...populated, items: [{ ...populated.items[0]!, title: 12, detail: null }] };
    for (const cast of [empty, populated, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
  });
  it("preserves the phone tier, core near miss and read/write probes", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "phone", weight: 3, dense: true });
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.realPath).toContain("barcode");
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "KeyValue" }));
    expect(probes).toContainEqual(
      expect.objectContaining({
        kind: "write",
        expect: meta.id,
        variant: { axis: "detail", value: "brief" },
      }),
    );
    const actions = affordancesOf(meta, stampItemIds(meta, props.parse(input)), "n1");
    for (const probe of probes.filter((probe) => probe.kind === "read"))
      expect(actions).toContainEqual(expect.objectContaining(probe.expect));
    expect(createRegistry({ packs: ["kitchen"] }).ids.includes(meta.id)).toBe(packReady("kitchen"));
  });
});

describe("NutritionFacts parts and states", () => {
  it.each(meta.states)("stamps one root for every %s example", (state) => {
    for (const example of examples)
      expect(render(example, state).match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
  });
  it("shows the complete panel and makes only serving controls and logging actionable", () => {
    const html = render(input);
    expect(addressedElements(html).get("home/c1/calories")?.text.join("")).toBe("630 kcal");
    expect(visibleTexts(html)).toEqual(expect.arrayContaining(["13.5", "g"]));
    expect(elementAt(html, "home/c1/log").attributes).toContain('role="button"');
    expect(html).toContain('aria-label="Increase servings"');
    expect(html).toContain('aria-label="Decrease servings"');
    expect(html).not.toMatch(/role="(radio|checkbox)"/);
    expect(readComponent(def, input, "n1").join("\n")).toContain("Protein: 27 (21%)");
  });
  it.each(examples)("reads every visible text in a filled example", (example) => {
    const reading = readComponent(def, example, "n1").join("\n");
    for (const line of visibleTexts(render(example))) expect(reading).toContain(line);
  });
  it("keeps macro IDs and controls in brief, while hiding every secondary row and allergen", () => {
    const brief = { ...input, detail: "brief" };
    const address = (value: unknown) => [...addressedElements(render(value)).keys()];
    expect(address(brief)).toEqual(
      address(input).filter((id) => !/\/(nutrients|allergens|allergen_\d)$/.test(id)),
    );
    expect(props.parse(brief)).toMatchObject({
      nutrients: props.parse(input).nutrients,
      allergens: input.allergens,
    });
    expect(readComponent(def, brief, "n1").join("\n")).not.toMatch(/Fiber|Sodium|Sesame|Contains/);
    expect(address({ ...input, nutrients: [], allergens: [] })).toEqual(address(brief));
  });
  it.each([
    ["empty", "Nothing here yet"],
    ["loading", "Loading"],
    ["success", "Added to food diary"],
  ] as const)("renders %s without live actions", (state, message) => {
    const html = render(input, state);
    expect(html).toContain(message);
    expect(html).not.toContain('data-testid="home/c1/servings"');
    expect(html).not.toContain('data-testid="home/c1/log"');
    const reading = readComponent(def, input, "n1", state).join("\n");
    expect(reading).not.toContain("[n1/");
    expect(reading.includes("Added to food diary")).toBe(state === "success");
  });
});

describe("NutritionFacts controller", () => {
  it.each([
    [0.25, "decrement", "increment"],
    [12, "increment", "decrement"],
  ] as const)(
    "stops at %s, then updates the scaled reading and dispatches logging",
    (servings, blocked, offered) => {
      const onAction = vi.fn();
      const controller = createScreenController({
        screen: { id: "home", components: [{ ...input, servings, c: meta.id, id: "n1" }] },
        defs: components,
        onAction,
      });
      try {
        const action = (action: typeof blocked) => controller.act({ address: "home/n1/servings", action });
        expect(controller.actionsAt("home/n1/servings")).toEqual([offered]);
        expect(action(blocked).ok).toBe(false);
        expect(action(offered).ok).toBe(true);
        expect(action(offered).ok).toBe(true);
        const adjusted = servings === 12 ? 11.5 : 0.75;
        expect(controller.read()).toContain(`Servings: ${adjusted} — Calories: ${420 * adjusted} kcal`);
        expect(controller.press("n1/log").ok).toBe(true);
        expect(onAction).toHaveBeenLastCalledWith({ address: "home/n1/log", action: "press" });
        expect(action(blocked).ok).toBe(true);
      } finally {
        controller.dispose();
      }
    },
  );
});

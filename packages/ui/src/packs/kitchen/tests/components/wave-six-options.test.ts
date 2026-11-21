import { describe, expect, it } from "vitest";
import { affordancesOf, components, readComponent, stampItemIds } from "@lmthing/ui/catalog";
import {
  addressedElements,
  elementAt,
  renderInstance,
  type AddressedElement,
} from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const ingredients = { servings: 2, groups: [{ items: [{ name: "Pasta", amount: 100, unit: "g" }] }] };
const item = { name: "Oats", qty: "1 bag", place: "cupboard", goto: "details" };
const cell = { day: 0, meal: "lunch", title: "Soup", goto: "details" };
const mealPlan = { week: "2026-11-16", meals: ["lunch", "dinner"], cells: [cell] };

function draw(id: "Ingredients" | "MealPlan" | "Pantry", input: unknown) {
  return renderInstance(id, input, "filled", theme);
}
const markup = (html: string) => html.slice(html.indexOf("</style>") + "</style>".length);
const partText = (node: AddressedElement): string[] => [...node.text, ...node.children.flatMap(partText)];

describe("Ingredients preparation options", () => {
  const def = components.Ingredients;
  it("keeps missing and explicit list styles identical", () => {
    const baseline = draw("Ingredients", ingredients);
    expect(markup(baseline)).toEqual(markup(draw("Ingredients", { ...ingredients, style: "list" })));
    expect(baseline).not.toMatch(/\/(?:allergens|swap)"/);
  });
  it("shows supplied allergens and swap in both styles without changing the controls", () => {
    const first = { ...ingredients.groups[0]!.items[0], allergens: ["Wheat", "Egg"], swap: "Use rice pasta" };
    const input = { ...ingredients, groups: [{ items: [first, { name: "Salt", allergens: [] }] }] };
    const addresses = (style: string) =>
      [...addressedElements(draw("Ingredients", { ...input, style })).keys()].sort();
    expect(addresses("prep")).toEqual(addresses("list"));
    const html = draw("Ingredients", { ...input, style: "prep", detail: "brief" });
    expect(elementAt(html, "home/c1/r1/have").attributes).toContain('role="checkbox"');
    const parts = addressedElements(html);
    expect(parts.has("home/c1/r1/allergens")).toBe(true);
    expect(partText(parts.get("home/c1/r1/allergen_1")!)).toEqual(["Wheat"]);
    expect(partText(parts.get("home/c1/r1/allergen_2")!)).toEqual(["Egg"]);
    expect(addressedElements(html).get("home/c1/r1/swap")?.text).toEqual(["Swap: Use rice pasta"]);
    expect(html).not.toContain("/r2/allergens");
    expect(readComponent(def, input, "i1").join("\n")).toContain("Contains: Wheat, Egg Swap: Use rice pasta");
  });
  it("limits allergen labels, count and swap length and rejects unsupported styles", () => {
    const parse = (extra: object) =>
      def.props.safeParse({ ...ingredients, groups: [{ items: [{ name: "Pasta", ...extra }] }] }).success;
    expect(parse({ allergens: Array(6).fill("a".repeat(16)), swap: "b".repeat(28) })).toBe(true);
    for (const extra of [
      { allergens: Array(7).fill("Egg") },
      { allergens: ["a".repeat(17)] },
      { swap: "x".repeat(29) },
    ])
      expect(parse(extra)).toBe(false);
    expect(def.props.safeParse({ ...ingredients, style: "grid" }).success).toBe(false);
  });
});

describe("MealPlan agenda and daily calories", () => {
  const def = components.MealPlan;
  it("keeps a week without calorie data unchanged", () => {
    const baseline = draw("MealPlan", mealPlan);
    expect(markup(baseline)).toEqual(markup(draw("MealPlan", { ...mealPlan, style: "week" })));
    expect(baseline).not.toContain("/kcal_");
  });
  it("sums known meals by day, distinguishes zero from missing, and keeps stable addresses", () => {
    const input = {
      ...mealPlan,
      cells: [
        { ...cell, kcal: 200 },
        { ...cell, meal: "dinner", kcal: 450 },
        { ...cell, day: 1, kcal: 0 },
        { ...cell, day: 2 },
        { ...cell, day: 2, meal: "dinner", kcal: 450 },
      ],
    };
    const week = draw("MealPlan", input);
    const day = draw("MealPlan", { ...input, style: "day" });
    const keys = (html: string) => [...addressedElements(html).keys()].sort();
    expect(keys(day)).toEqual(keys(week));
    for (const html of [week, day]) {
      const parts = addressedElements(html);
      expect(partText(parts.get("home/c1/kcal_1")!)).toEqual(["650 kcal"]);
      expect(partText(parts.get("home/c1/kcal_2")!)).toEqual(["0 kcal"]);
      expect(html).not.toContain("/kcal_3");
    }
    const reading = readComponent(def, { ...input, style: "day" }, "m1").join("\n");
    expect(reading).toContain("Monday: 650 kcal");
    expect(reading).toContain("Tuesday: 0 kcal");
    expect(reading).not.toContain("Wednesday:");
    expect(reading).toContain("[m1/r1 press→details]");
    expect(reading).toContain("[m1/r14/add press]");
  });
  it("rejects authored totals, invalid calorie values and unknown styles", () => {
    for (const kcal of [-1, Infinity, 10001])
      expect(def.props.safeParse({ ...mealPlan, cells: [{ ...cell, kcal }] }).success).toBe(false);
    expect(def.props.safeParse({ ...mealPlan, kcal: 650 }).success).toBe(false);
    expect(def.props.safeParse({ ...mealPlan, style: "month" }).success).toBe(false);
  });
});

describe("Pantry stock and opened date", () => {
  const def = components.Pantry;
  it.each([
    ["1 bag", undefined, false],
    ["1 bag", 1, true],
    ["1.5 kg", 2, true],
    ["2 bags", 1, false],
    ["several", 2, false],
    ["1/2 bag", 2, false],
    ["0", 0, true],
  ] as const)(
    "uses the same rule in the view and reader for %s at %s without adding actions",
    (qty, lowAt, low) => {
      const input = { items: [{ ...item, qty, lowAt }] };
      const html = draw("Pantry", input);
      const reading = readComponent(def, input, "p1").join("\n");
      const actions = affordancesOf(def.meta, stampItemIds(def.meta, def.props.parse(input)), "p1");
      expect(html.includes('data-testid="home/c1/r1/low"')).toBe(low);
      expect(reading.includes("Low stock")).toBe(low);
      expect(actions.map((action) => action.part)).toEqual(["root", "used"]);
    },
  );
  it("validates opened dates and shows them independently of expiry and detail", () => {
    const input = { detail: "brief", items: [{ ...item, openedOn: "2024-02-29", useBy: "2024-03-02" }] };
    const html = addressedElements(draw("Pantry", input));
    expect(html.get("home/c1/r1/opened_on")?.text.join(" ")).toMatch(/^Opened .*29/);
    expect(html.has("home/c1/r1/use_by")).toBe(true);
    expect(html.has("home/c1/r1/place")).toBe(false);
    expect(readComponent(def, input, "p1").join("\n")).toContain("2024-02-29");
    for (const extra of [{ openedOn: "2026-02-29" }, { lowAt: -1 }, { restock: true }])
      expect(def.props.safeParse({ items: [{ ...item, ...extra }] }).success).toBe(false);
  });
});

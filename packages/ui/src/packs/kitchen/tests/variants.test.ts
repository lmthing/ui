import { describe, expect, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  readComponent,
  stampItemIds,
  type as typography,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { renderInstance, styleAt } from "../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const variants = [
  ["CookSteps", "detail", "full", "brief", "uses", "Olive oil"],
  ["FoodLog", "detail", "full", "brief", "amount", "1 slice"],
  ["GroceryList", "detail", "full", "brief", "by", "Sam"],
  ["Ingredients", "detail", "full", "brief", "note", "Chopped"],
  ["MealPlan", "media", "thumb", "none", "photo", undefined],
  ["Pantry", "detail", "full", "brief", "place", "fridge"],
] as const;

describe.each(variants)("%s %s", (id, axis, defaultValue, alternative, part, label) => {
  const def = components[id];
  const input = def.examples[0];
  const variant = { ...input, [axis]: alternative };
  const addresses = (value: unknown) =>
    [
      ...renderInstance(id, value, "filled", theme, { resolvePhoto: (ref) => ref }).matchAll(
        /data-testid="(home\/c1\/[^"]+)"/g,
      ),
    ].map((match) => match[1]);
  const actions = (value: unknown) =>
    affordancesOf(def.meta, stampItemIds(def.meta, def.props.parse(value)), "c1");

  it("defaults the declared axis and rejects values outside the subset", () => {
    expect(def.props.parse(input)).toMatchObject({ [axis]: defaultValue });
    expect(def.props.safeParse({ ...input, [axis]: "unsupported" }).success).toBe(false);
    expect(addresses(input)).toEqual(addresses({ ...input, [axis]: defaultValue }));
  });

  it("hides just the declared part without changing ids or actions", () => {
    const baseline = addresses(input);
    const isHidden = (address: string | undefined) =>
      new RegExp(id === "CookSteps" ? `/c1/${part}$` : `/r\\d+/${part}$`).test(address ?? "");
    expect(baseline.some(isHidden)).toBe(true);
    expect(addresses(variant).sort()).toEqual(baseline.filter((address) => !isHidden(address)).sort());
    expect(actions(variant)).toEqual(actions(input));
    if (label) {
      expect(readComponent(def, input, "c1").join("\n")).toContain(label);
      expect(readComponent(def, variant, "c1").join("\n")).not.toContain(label);
    }
  });
});

it("FoodLog leaves density unset for the app to resolve and accepts only the declared values", () => {
  const { props, examples } = components.FoodLog;
  expect(props.parse(examples[0]).density).toBeUndefined();
  expect(props.parse(examples[1]).density).toBe("compact");
  expect(props.safeParse({ ...examples[0], density: "tight" }).success).toBe(false);
});

it("keeps the compact FoodLog total above row values and below the comfortable total", () => {
  const { examples } = components.FoodLog;
  const compact = renderInstance("FoodLog", examples[1], "filled", theme);
  const comfortable = renderInstance("FoodLog", examples[2], "filled", theme);
  expect(styleAt(compact, "home/c1/total")).toContain(`font-size:${typography.title.size}px`);
  expect(styleAt(compact, "home/c1/r2/kcal")).toContain(`font-size:${typography.label.size}px`);
  expect(styleAt(comfortable, "home/c1/total")).toContain(`font-size:${typography.number.size}px`);
});

it("KitchenTimers changes its layout without changing countdown data or action addresses", () => {
  const { props, examples, meta } = components.KitchenTimers;
  const input = examples[0];
  const rows = { ...input, arrange: "rows" };
  expect(props.parse(input).arrange).toBe("grid");
  expect(props.safeParse({ ...input, arrange: "strip" }).success).toBe(false);
  expect(props.parse(rows).timers).toEqual(props.parse(input).timers);
  const actions = (value: unknown) => affordancesOf(meta, stampItemIds(meta, props.parse(value)), "c1");
  expect(actions(rows)).toEqual(actions(input));
});

it("Pantry accepts row highlights but safeguards computed expiry tones", () => {
  const { props, examples } = components.Pantry;
  expect(props.parse(examples[0]).items[0]?.mark).toBe("none");
  expect(props.parse(examples[1]).items[0]?.mark).toBe("highlight");
  const item = examples[0]!.items[0];
  for (const extra of [{ mark: "new" }, { tone: "warn" }])
    expect(props.safeParse({ items: [{ ...item, ...extra }] }).success).toBe(false);
});

it("keeps Pantry's card and both item boxes fixed when only one item is highlighted", () => {
  const { examples } = components.Pantry;
  const marked = renderInstance("Pantry", examples[1], "filled", theme);
  const plain = renderInstance("Pantry", examples[2], "filled", theme);
  for (const part of ["root", "r1/root", "r2/root", "r2/name"])
    expect(styleAt(marked, `home/c1/${part}`)).toBe(styleAt(plain, `home/c1/${part}`));
  const name = "home/c1/r1/name";
  const highlighted = styleAt(marked, name),
    unmarked = styleAt(plain, name);
  const withoutColor = (style: string) =>
    style.split(";").filter((rule) => rule && !rule.startsWith("color:"));
  expect(highlighted).toContain("color:var(--accent)");
  expect(withoutColor(highlighted)).toEqual(withoutColor(unmarked));
});

it("dispatches the cooking timer's start and stop at distinct addresses", () => {
  const onAction = vi.fn();
  const controller = createScreenController({
    screen: { id: "home", components: [{ c: "CookSteps", id: "c1", ...components.CookSteps.examples[0] }] },
    defs: components,
    onAction,
  });
  try {
    expect(controller.press("c1/timer").ok).toBe(true);
    expect(controller.press("c1/timer_stop").ok).toBe(true);
    expect(onAction.mock.calls).toEqual([
      [{ address: "home/c1/timer", action: "start" }],
      [{ address: "home/c1/timer_stop", action: "stop" }],
    ]);
  } finally {
    controller.dispose();
  }
});

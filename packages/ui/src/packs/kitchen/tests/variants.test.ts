import { describe, expect, it } from "vitest";
import { affordancesOf, components, readComponent, stampItemIds } from "@lmthing/ui/catalog";
import { renderInstance } from "../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const variants = [
  ["FoodLog", "detail", "full", "brief", "amount", "1 slice"],
  ["GroceryList", "detail", "full", "brief", "by", "Sam"],
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
    const isHidden = (address: string | undefined) => new RegExp(`/r\\d+/${part}$`).test(address ?? "");
    expect(baseline.some(isHidden)).toBe(true);
    expect(addresses(variant)).toEqual(baseline.filter((address) => !isHidden(address)));
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

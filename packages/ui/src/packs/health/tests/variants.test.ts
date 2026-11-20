import { expect, it } from "vitest";
import {
  affordancesOf,
  components,
  migrateLine,
  readComponent,
  stampItemIds,
  type ComponentName,
  type Definition,
} from "@lmthing/ui/catalog";
import { selectedIds } from "../../../../scripts/build";
import { variantChoices, variantPairs } from "../../../../scripts/variants";
import { renderInstance } from "../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const cases = {
  ActivityRings: ["detail", "brief", "of 5"],
  Cycle: ["detail", "brief", "Fertile window"],
  Exercise: ["media", "none", "photo:exercise"],
  HabitGrid: ["lead", "none", ""],
  Measurements: ["detail", "brief", "since first reading"],
  Medication: ["detail", "brief", "4 left"],
  SymptomLog: ["detail", "brief", "2/5"],
  Vitals: ["detail", "brief", "08:10"],
  Workout: ["detail", "brief", "Elapsed time"],
} as const;
const ids = selectedIds(Object.keys(cases) as (keyof typeof cases)[]);
const defs: Record<ComponentName, Definition> = components;

const addresses = (id: ComponentName, input: unknown) =>
  [...renderInstance(id, input, "filled", theme).matchAll(/data-testid="(home\/c1\/[^"]+)"/g)].map(
    (m) => m[1]!,
  );

it.each(ids)("%s keeps old input and defaults valid, and rejects undeclared values", (id) => {
  const def = defs[id];
  const old = def.examples[0] as Record<string, unknown>;
  const line = { c: id, id: "c1", ...old };
  expect(migrateLine(line)).toBe(line); // These components had no authored legacy presentation props.
  const parsed = def.props.parse(old);
  const expected = Object.fromEntries(
    Object.entries(def.meta.variants ?? {}).map(([axis, [value]]) => [
      axis,
      axis === "density" ? undefined : value,
    ]),
  );
  for (const [axis, value] of Object.entries(expected)) {
    expect(parsed[axis]).toBe(value);
    expect(def.props.safeParse({ ...old, [axis]: "unsupported" }).success).toBe(false);
  }
  const markup = (input: unknown) =>
    renderInstance(id, input, "filled", theme).replace(/<style[\s\S]*?<\/style>/g, "");
  expect(markup(old)).toBe(markup({ ...old, ...expected }));
  expect(def.props.safeParse({ ...old, style: "plain" }).success).toBe(false);
});

it.each(ids)("%s deltas preserve item ids and all control affordances", (id) => {
  const def = defs[id];
  const old = def.examples[0];
  const key = def.meta.items?.key;
  for (const choice of variantChoices(def.meta)) {
    for (const { baseline, input } of variantPairs(def.meta, old, choice)) {
      const before = stampItemIds(def.meta, def.props.parse(baseline));
      const after = stampItemIds(def.meta, def.props.parse(input));
      const itemsOf = (props: typeof before) =>
        key ? (props[key] as { id: string }[]).map(({ id }) => id) : [];
      const items = itemsOf(before);
      expect(itemsOf(after)).toEqual(items);
      expect(affordancesOf(def.meta, after, "c1")).toEqual(affordancesOf(def.meta, before, "c1"));
      const left = addresses(id, baseline),
        right = addresses(id, input);
      type Delta = keyof NonNullable<Definition["meta"]["variantParts"]>;
      const hidden = def.meta.variantParts?.[`${choice.axis}.${choice.value}` as Delta]?.hides ?? [];
      expect(new Set(right).size).toBe(right.length);
      expect(right).toEqual(left.filter((address) => !hidden.includes(address.split("/").at(-1)!)));
    }
  }
});

it.each(ids)("%s has a requested content variant and reads only visible content", (id) => {
  const def = defs[id];
  const [axis, value, hidden] = cases[id];
  const old = def.examples[0] as Record<string, unknown>;
  const next = { ...old, [axis]: value };
  expect(def.probes).toContainEqual(expect.objectContaining({ kind: "write", variant: { axis, value } }));
  expect(addresses(id, old).length).toBeGreaterThan(addresses(id, next).length);
  if (hidden) {
    expect(readComponent(def, old, "c1").join("\n")).toContain(hidden);
    expect(readComponent(def, next, "c1").join("\n")).not.toContain(hidden);
  }
});

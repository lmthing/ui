import type { Axis, Definition, Variants } from "@lmthing/ui/catalog";

type Input = Record<string, unknown>;
type Choice = { axis: Axis; value: string; item: boolean };
type Pair = { baseline: Input; input: Input; itemIndex?: number };

export const variantSheet = { width: 390, preset: "calm", mode: "light", accent: "moss" } as const;

const entriesOf = (variants?: Variants) => Object.entries(variants ?? {}) as [Axis, readonly string[]][];

export function variantChoices(meta: Definition["meta"], includeDefaults = false): Choice[] {
  const choicesOf = (declarations: Variants | undefined, item: boolean) =>
    entriesOf(declarations).flatMap(([axis, values]) =>
      values.slice(includeDefaults ? 0 : 1).map((value) => ({ axis, value, item })),
    );
  return [...choicesOf(meta.variants, false), ...choicesOf(meta.items?.variants, true)];
}

function withDefaults(input: Input, variants?: Variants) {
  return {
    ...input,
    ...Object.fromEntries(entriesOf(variants).map(([axis, values]) => [axis, values[0]])),
  };
}

function itemsOf(input: Input, key: string): Input[] {
  const rows = input[key];
  return Array.isArray(rows) ? rows : [];
}

/** Compare one axis at a time, retaining the authored content and order. */
export function variantPairs(meta: Definition["meta"], example: unknown, choice: Choice): Pair[] {
  const raw = example as Input;
  const baseline = withDefaults(raw, meta.variants);
  if (choice.axis === "overflow" && !choice.item && meta.variants?.overflow?.includes("all"))
    baseline.overflow = "all";
  const items = meta.items;
  if (items?.variants) {
    baseline[items.key] = itemsOf(raw, items.key).map((item) => {
      const defaults = withDefaults(item, items.variants);
      // Leave inherited item trail unset when exercising the collection trail.
      if (meta.variants?.trail && items.variants?.trail) delete defaults.trail;
      return defaults;
    });
  }
  if (!choice.item) return [{ baseline, input: { ...baseline, [choice.axis]: choice.value } }];
  if (!items?.variants) return [];

  const rows = itemsOf(baseline, items.key);
  const at = (index: number, value: string) => ({
    ...baseline,
    [items.key]: rows.map((row, rowIndex) => (index === rowIndex ? { ...row, [choice.axis]: value } : row)),
  });
  const defaultValue = (items.variants as Variants)[choice.axis]![0];
  return rows.map((_, itemIndex) => ({
    baseline: at(itemIndex, defaultValue),
    input: at(itemIndex, choice.value),
    itemIndex,
  }));
}

function previewScore(def: Definition, example: Input, choice: Choice, itemIndex?: number) {
  const { key } = def.meta.items ?? {};
  const rows = key ? itemsOf(example, key) : [];
  if (choice.axis === "overflow" && choice.value === "peek") return rows.length;
  const authored = itemIndex === undefined ? example : rows[itemIndex];
  return Number(authored?.[choice.axis] === choice.value);
}

/** Show each alternative once, preferring a valid example authored for that value. */
export function variantPreviews(def: Definition) {
  return variantChoices(def.meta).map((choice) => {
    const candidates = def.examples
      .flatMap((example) =>
        variantPairs(def.meta, example, choice).map(({ input, itemIndex }) => ({
          input,
          score: previewScore(def, example as Input, choice, itemIndex),
        })),
      )
      .filter(({ input }) => def.props.safeParse(input).success)
      .sort((a, b) => b.score - a.score);
    const preview = candidates[0];
    if (!preview) throw new Error(`${def.meta.id}: no example for ${variantLabel(choice)}`);
    return { ...choice, input: preview.input };
  });
}

export function variantLabel({ axis, value, item }: Choice) {
  return `${item ? "item " : ""}${axis}: ${value}`;
}

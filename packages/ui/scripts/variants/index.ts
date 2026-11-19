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

function itemsOf(input: Input, key: string): Input[] {
  const rows = input[key];
  return Array.isArray(rows) ? rows : [];
}

/** Compare one axis at a time, retaining the authored content and order. */
export function variantPairs(meta: Definition["meta"], example: unknown, choice: Choice): Pair[] {
  const raw = example as Input;
  const items = meta.items;
  if (!choice.item) {
    const values: readonly string[] = meta.variants?.[choice.axis] ?? [];
    const reference = choice.axis === "overflow" && values.includes("all") ? "all" : values[0];
    const pair = (base: Input) => ({
      baseline: { ...base, [choice.axis]: reference },
      input: { ...base, [choice.axis]: choice.value },
    });
    if (choice.axis !== "trail" || !items?.variants?.trail) return [pair(raw)];
    const rows = itemsOf(raw, items.key);
    // Also exercise inherited trail without overrides masking the component-level value.
    if (!rows.some((row) => Object.hasOwn(row, "trail"))) return [pair(raw)];
    const inherited = rows.map(({ trail: _trail, ...row }) => row);
    return [pair({ ...raw, [items.key]: inherited }), pair(raw)];
  }
  if (!items?.variants) return [];

  const rows = itemsOf(raw, items.key);
  const at = (index: number, value?: string) => ({
    ...raw,
    [items.key]: rows.map((row, rowIndex) => {
      if (index !== rowIndex) return row;
      const { [choice.axis]: _authored, ...rest } = row;
      return value === undefined ? rest : { ...rest, [choice.axis]: value };
    }),
  });
  const defaultValue = (items.variants as Variants)[choice.axis]![0];
  const canInherit = choice.axis === "trail" && Boolean(meta.variants?.trail);
  return rows.flatMap((_, itemIndex) => {
    const input = at(itemIndex, choice.value);
    const explicit = { baseline: at(itemIndex, defaultValue), input, itemIndex };
    return canInherit ? [explicit, { baseline: at(itemIndex), input, itemIndex }] : [explicit];
  });
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

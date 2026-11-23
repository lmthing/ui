import { expect, it } from "vitest";
import {
  accents,
  components,
  presets,
  readComponent,
  stampItemIds,
  type Definition,
} from "@lmthing/ui/catalog";
import { renderers } from "@lmthing/ui/kit";
import { selectedIds } from "../../scripts/build";
import { variantChoices, variantLabel, variantPairs } from "../../scripts/variants";
import { renderExample, renderInstance, type Theme } from "../render";
import { conformanceThemes } from "../themes";
import { derivedItemIds, derivedItemIssues, renderedAddresses, variantPartIssues } from "./variant-parts";
import { overflowAllIssues, peekHiddenItems, variantPeekIssues } from "./variant-peek";
import { rowAddressIssues } from "./row-addresses";

type Props = Record<string, unknown>;
type Choice = ReturnType<typeof variantChoices>[number];
type Pair = ReturnType<typeof variantPairs>[number];
type Id = keyof typeof renderers;

function listTrailVariant(value: Props, index: number) {
  const row = (value.rows as Props[])[index]!;
  const trail = String(row.trail ?? value.trail);
  return trail === "chevron" && (!row.goto || value.style === "expand") ? "none" : trail;
}

function checkListTrail(item: string, trail: string, addresses: string[]) {
  const row = `home/c1/${item}`;
  if (addresses.includes(`${row}/root`))
    expect(addresses.includes(`${row}/trail`), `${row}/trail with ${trail}`).toBe(trail !== "none");
}

function listTrailChange(
  item: string,
  index: number,
  before: { props: Props; addresses: string[] },
  after: { props: Props; addresses: string[] },
) {
  const from = listTrailVariant(before.props, index);
  const to = listTrailVariant(after.props, index);
  checkListTrail(item, from, before.addresses);
  checkListTrail(item, to, after.addresses);
  return { from, to };
}

function variantOverflow(
  choice: Choice,
  from: unknown,
  to: unknown,
  items: string[],
  before: string[],
  after: string[],
) {
  if (choice.axis !== "overflow") return { hidden: [], issues: [] };
  if (choice.value === "peek") return peekHiddenItems(items, after, from === "all" ? before : undefined);
  return { hidden: [], issues: to === "all" ? overflowAllIssues(items, after) : [] };
}

function checkPair(
  id: Id,
  def: Definition,
  choice: Choice,
  { baseline, input, itemIndex, inheritsTrail }: Pair,
  theme: Theme,
) {
  const baseProps = stampItemIds(def.meta, def.props.parse(baseline) as Props);
  const props = stampItemIds(def.meta, def.props.parse(input) as Props);
  const key = def.meta.items?.key;
  const rowsOf = (value: Props) => (key ? ((value[key] ?? []) as (Props & { id: string })[]) : []);
  const rows = rowsOf(baseProps);
  const authoredIds = rows.map(({ id }) => id);
  expect(rowsOf(props).map(({ id }) => id)).toEqual(authoredIds);
  const options = { resolvePhoto: (ref: string) => ref };
  const { html: beforeHTML, deviceData } = renderExample(id, baseline, "filled", theme, options);
  // Vary the axis, not the host's data snapshot.
  const afterHTML = renderInstance(id, input, "filled", theme, { ...options, deviceData });
  const before = renderedAddresses(beforeHTML);
  const after = renderedAddresses(afterHTML);
  const derived = !!(deviceData && key && !Array.isArray(baseProps[key]));
  const items = derived ? derivedItemIds(before) : authoredIds;
  const { hidden, issues } = variantOverflow(choice, baseline.overflow, input.overflow, items, before, after);
  const item = itemIndex === undefined ? undefined : items[itemIndex];
  const trailChange =
    id === "List" && choice.axis === "trail" && item && itemIndex !== undefined
      ? listTrailChange(item, itemIndex, { props: baseProps, addresses: before }, { props, addresses: after })
      : undefined;
  const inheritedTrail =
    trailChange?.from ??
    (inheritsTrail && itemIndex !== undefined ? (rows[itemIndex]?.trail ?? baseProps.trail) : undefined);
  const variant = trailChange ? { ...choice, value: trailChange.to } : choice;
  expect([
    ...issues,
    ...(derived
      ? [...derivedItemIssues(def.meta, baseProps, before), ...derivedItemIssues(def.meta, props, after)]
      : []),
    ...rowAddressIssues(rows, beforeHTML, afterHTML),
    ...variantPartIssues(def.meta, variant, before, after, {
      ...(item ? { item } : {}),
      ...(typeof inheritedTrail === "string" ? { inheritedTrail } : {}),
      items,
      hidden,
    }),
    ...(hidden.length
      ? variantPeekIssues(
          def,
          input,
          { input: baseline, props: baseProps },
          hidden,
          readComponent(def, input, "c1", "filled", {}, undefined, deviceData),
        )
      : []),
  ]).toEqual([]);
  return hidden.length;
}

const ids = selectedIds(Object.keys(renderers) as Id[], import.meta.url);
const themes = conformanceThemes(presets, accents[0].id);
for (const id of ids) {
  const def: Definition = components[id];
  for (const choice of variantChoices(def.meta, true)) {
    it.each(themes)(
      `${id} ${variantLabel(choice)} keeps the variant address contract in $preset $mode`,
      (theme) => {
        const pairs = def.examples.flatMap((example) =>
          variantPairs(def.meta, example, choice).filter(
            ({ baseline, input }) =>
              def.props.safeParse(baseline).success && def.props.safeParse(input).success,
          ),
        );
        expect(pairs.length, `Provide an example that supports ${variantLabel(choice)}`).toBeGreaterThan(0);
        const hidden = pairs.map((pair) => checkPair(id, def, choice, pair, theme));
        if (choice.axis === "overflow" && choice.value === "peek")
          expect(
            Math.max(...hidden),
            "Provide an overflow: peek example that actually hides items",
          ).toBeGreaterThan(0);
      },
    );
  }
}

it("allows ready components without variant declarations", () => {
  for (const id of ids) {
    const { meta } = components[id] as Definition;
    if (!meta.variants && !meta.items?.variants) expect(variantChoices(meta, true)).toEqual([]);
  }
});

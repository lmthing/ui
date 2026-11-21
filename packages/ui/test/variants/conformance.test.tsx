import { expect, it } from "vitest";
import { components, readComponent, stampItemIds, type Definition } from "@lmthing/ui/catalog";
import { renderers } from "@lmthing/ui/kit";
import { selectedIds } from "../../scripts/build";
import { variantChoices, variantLabel, variantPairs } from "../../scripts/variants";
import { conformanceThemes } from "../conformance-themes";
import { renderExample, renderInstance, type Theme } from "../render";
import { derivedItemIds, derivedItemIssues, renderedAddresses, variantPartIssues } from "./variant-parts";
import { overflowAllIssues, peekHiddenItems, variantPeekIssues } from "./variant-peek";
import { rowAddressIssues } from "./row-addresses";

type Props = Record<string, unknown>;
type Choice = ReturnType<typeof variantChoices>[number];
type Pair = ReturnType<typeof variantPairs>[number];
type Id = keyof typeof renderers;

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
  const afterHTML = renderInstance(id, input, "filled", theme, {
    ...options,
    deviceData,
  });
  const before = renderedAddresses(beforeHTML);
  const after = renderedAddresses(afterHTML);
  const derived = !!(deviceData && key && !Array.isArray(baseProps[key]));
  const items = derived ? derivedItemIds(before) : authoredIds;
  const isPeek = choice.axis === "overflow" && choice.value === "peek";
  const { hidden, issues } = isPeek
    ? peekHiddenItems(items, after, baseline.overflow === "all" ? before : undefined)
    : {
        hidden: [],
        issues: choice.axis === "overflow" && input.overflow === "all" ? overflowAllIssues(items, after) : [],
      };
  const item = itemIndex === undefined ? undefined : items[itemIndex];
  const inheritedTrail =
    inheritsTrail && itemIndex !== undefined ? (rows[itemIndex]?.trail ?? baseProps.trail) : undefined;
  expect([
    ...issues,
    ...(derived
      ? [...derivedItemIssues(def.meta, baseProps, before), ...derivedItemIssues(def.meta, props, after)]
      : []),
    ...rowAddressIssues(rows, beforeHTML, afterHTML),
    ...variantPartIssues(def.meta, choice, before, after, {
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
for (const id of ids) {
  const def: Definition = components[id];
  for (const choice of variantChoices(def.meta, true)) {
    it.each(conformanceThemes)(
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

import { expect, it } from "vitest";
import { components, readComponent, stampItemIds, type Definition } from "@lmthing/ui/catalog";
import { renderers } from "@lmthing/ui/kit";
import { selectedIds } from "../../scripts/build";
import { variantChoices, variantLabel, variantPairs, variantSheet } from "../../scripts/variants";
import { renderInstance } from "../render";
import { renderedAddresses, variantPartIssues } from "./variant-parts";
import { overflowAllIssues, peekHiddenItems, variantPeekIssues } from "./variant-peek";
import { rowAddressIssues } from "./row-addresses";

type Props = Record<string, unknown>;
type Choice = ReturnType<typeof variantChoices>[number];
type Pair = ReturnType<typeof variantPairs>[number];
type Id = keyof typeof renderers;

function checkPair(id: Id, def: Definition, choice: Choice, { baseline, input, itemIndex }: Pair) {
  const baseProps = stampItemIds(def.meta, def.props.parse(baseline) as Props);
  const props = stampItemIds(def.meta, def.props.parse(input) as Props);
  const key = def.meta.items?.key;
  const rowsOf = (value: Props) => (key ? ((value[key] ?? []) as (Props & { id: string })[]) : []);
  const rows = rowsOf(baseProps);
  const items = rows.map(({ id }) => id);
  expect(rowsOf(props).map(({ id }) => id)).toEqual(items);
  const render = (value: unknown) =>
    renderInstance(id, value, "filled", variantSheet, { resolvePhoto: (ref) => ref });
  const beforeHTML = render(baseline);
  const afterHTML = render(input);
  const before = renderedAddresses(beforeHTML);
  const after = renderedAddresses(afterHTML);
  const isPeek = choice.axis === "overflow" && choice.value === "peek";
  const { hidden, issues } = isPeek
    ? peekHiddenItems(items, after, baseline.overflow === "all" ? before : undefined)
    : {
        hidden: [],
        issues: choice.axis === "overflow" && input.overflow === "all" ? overflowAllIssues(items, after) : [],
      };
  const item = itemIndex === undefined ? undefined : items[itemIndex];
  expect([
    ...issues,
    ...rowAddressIssues(rows, beforeHTML, afterHTML),
    ...variantPartIssues(def.meta, choice, before, after, { ...(item ? { item } : {}), items, hidden }),
    ...(hidden.length
      ? variantPeekIssues(
          def,
          input,
          { input: baseline, props: baseProps },
          hidden,
          readComponent(def, input, "c1"),
        )
      : []),
  ]).toEqual([]);
  return hidden.length;
}

for (const id of selectedIds(Object.keys(renderers) as Id[])) {
  const def: Definition = components[id];
  for (const choice of variantChoices(def.meta, true)) {
    it(`${id} ${variantLabel(choice)} keeps the variant address contract`, () => {
      const pairs = def.examples.flatMap((example) =>
        variantPairs(def.meta, example, choice).filter(
          ({ baseline, input }) =>
            def.props.safeParse(baseline).success && def.props.safeParse(input).success,
        ),
      );
      expect(pairs.length, `Provide an example that supports ${variantLabel(choice)}`).toBeGreaterThan(0);
      const hidden = pairs.map((pair) => checkPair(id, def, choice, pair));
      if (choice.axis === "overflow" && choice.value === "peek")
        expect(
          Math.max(...hidden),
          "Provide an overflow: peek example that actually hides items",
        ).toBeGreaterThan(0);
    });
  }
}

it("allows ready components without variant declarations", () => {
  for (const id of selectedIds(Object.keys(renderers) as Id[])) {
    const { meta } = components[id] as Definition;
    if (!meta.variants && !meta.items?.variants) expect(variantChoices(meta, true)).toEqual([]);
  }
});

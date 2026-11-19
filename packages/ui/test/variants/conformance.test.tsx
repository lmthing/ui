import { expect, it } from "vitest";
import { components, readComponent, stampItemIds, type Definition } from "@lmthing/ui/catalog";
import { renderers } from "@lmthing/ui/kit";
import { selectedIds } from "../../scripts/build";
import { variantChoices, variantLabel, variantPairs, variantSheet } from "../../scripts/variants";
import { renderInstance } from "../render";
import { renderedAddresses, variantPartIssues } from "./variant-parts";
import { peekHiddenItems, variantPeekIssues } from "./variant-peek";

type Props = Record<string, unknown>;
type Choice = ReturnType<typeof variantChoices>[number];
type Pair = ReturnType<typeof variantPairs>[number];
type Id = keyof typeof renderers;

function checkPair(id: Id, def: Definition, choice: Choice, { baseline, input, itemIndex }: Pair) {
  const baseProps = stampItemIds(def.meta, def.props.parse(baseline) as Props);
  const props = stampItemIds(def.meta, def.props.parse(input) as Props);
  const key = def.meta.items?.key;
  const ids = (value: Props) => (key ? ((value[key] ?? []) as { id: string }[]).map(({ id }) => id) : []);
  expect(ids(props)).toEqual(ids(baseProps));
  const render = (value: unknown) =>
    renderedAddresses(renderInstance(id, value, "filled", variantSheet, { resolvePhoto: (ref) => ref }));
  const before = render(baseline);
  const after = render(input);
  const items = ids(baseProps);
  const isPeek = choice.axis === "overflow" && choice.value === "peek";
  const { hidden, issues } = isPeek ? peekHiddenItems(items, after) : { hidden: [], issues: [] };
  expect([
    ...issues,
    ...variantPartIssues(def.meta, choice, before, after, { item: items[itemIndex!], items, hidden }),
    ...(hidden.length
      ? variantPeekIssues(def, input, baseProps, hidden, readComponent(def, input, "c1"))
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

import { expect, it } from "vitest";
import { z } from "zod";
import { components, itemVariantProps, variantProps, type Definition } from "@lmthing/ui/catalog";
import { variantChoices, variantPairs, variantPreviews } from "./index";

const variants = { detail: ["full", "brief"], trail: ["chevron", "none"] } as const;
const itemVariants = { trail: ["none", "chevron"], mark: ["none", "highlight"] } as const;
const examples = [
  { rows: [{ title: "First" }, { title: "Second", mark: "highlight" }] },
  { detail: "brief", rows: [{ title: "Third" }] },
];
const fixture: Definition = {
  ...components.List,
  meta: {
    ...components.List.meta,
    variants,
    items: { key: "rows", parts: ["root"], variants: itemVariants },
  },
  props: z.strictObject({
    ...variantProps(variants),
    rows: z.array(
      z.strictObject({ ...itemVariantProps(itemVariants, { inheritTrail: true }), title: z.string() }),
    ),
  }),
  examples,
};

it("enumerates local defaults and alternatives at both declaration levels", () => {
  expect(variantChoices(fixture.meta, true)).toHaveLength(8);
  expect(variantChoices(fixture.meta)).toEqual([
    { axis: "detail", value: "brief", item: false },
    { axis: "trail", value: "none", item: false },
    { axis: "trail", value: "chevron", item: true },
    { axis: "mark", value: "highlight", item: true },
  ]);
});

it("compares one item at a time without shadowing the collection trail", () => {
  expect(
    variantPairs(fixture.meta, examples[0], { axis: "trail", value: "none", item: false })[0]?.input,
  ).toMatchObject({
    trail: "none",
    rows: [{ title: "First" }, { title: "Second", mark: "highlight" }],
  });
  const pairs = variantPairs(fixture.meta, examples[0], { axis: "trail", value: "chevron", item: true });
  expect(pairs.map(({ itemIndex, input }) => ({ itemIndex, rows: input.rows }))).toEqual([
    {
      itemIndex: 0,
      rows: [
        { title: "First", trail: "chevron" },
        { title: "Second", mark: "highlight" },
      ],
    },
    {
      itemIndex: 1,
      rows: [{ title: "First" }, { title: "Second", mark: "highlight", trail: "chevron" }],
    },
  ]);
});

it("uses a valid authored example once and does not mutate the examples", () => {
  const previews = variantPreviews(fixture);
  expect(previews).toHaveLength(4);
  expect(previews[0]?.input).toMatchObject({ detail: "brief", rows: [{ title: "Third" }] });
  expect(previews[3]?.input).toMatchObject({
    rows: [{ title: "First" }, { title: "Second", mark: "highlight" }],
  });
  expect(examples[0]?.rows[1]).toHaveProperty("mark", "highlight");
  expect(examples[0]?.rows[0]).not.toHaveProperty("mark");
});

it("omits a sheet when there are no alternatives", () => {
  const { variants: _variants, items: _items, ...meta } = fixture.meta;
  expect(variantPreviews({ ...fixture, meta })).toEqual([]);
});

it("preserves explicitly authored row actions and other axes when exercising overflow", () => {
  const meta = { ...fixture.meta, variants: { ...variants, overflow: ["all", "peek"] } } as const;
  const example = {
    detail: "brief",
    trail: "none",
    rows: [{ title: "First" }, { title: "Second", trail: "chevron" }],
  };
  expect(variantPairs(meta, example, { axis: "overflow", value: "peek", item: false })).toEqual([
    { baseline: { ...example, overflow: "all" }, input: { ...example, overflow: "peek" } },
  ]);
});

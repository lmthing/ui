import { expect, it } from "vitest";
import { z } from "zod";
import {
  checkScreen,
  components,
  itemVariantProps,
  text,
  variantProps,
  type Definition,
  type ScreenLike,
} from "@lmthing/ui/catalog";

const variants = { emphasis: ["normal", "hero"], media: ["cover", "thumb"] } as const;
const rowVariants = { mark: ["none", "highlight", "new"] } as const;
const items = { key: "rows", prefix: "p", parts: ["root"], variants: rowVariants } as const;
const base = { ...components.List, examples: [], probes: [], fallback: () => ({}) };
const collection = {
  ...base,
  meta: { ...base.meta, id: "Collection", variants, items },
  props: z.strictObject({
    ...variantProps(variants),
    rows: z.array(z.strictObject({ title: text(20), ...itemVariantProps(rowVariants) })),
  }),
} satisfies Definition;
const single = {
  ...components.Card,
  meta: { ...components.Card.meta, id: "Single", variants },
  props: z.strictObject({ ...variantProps(variants), title: text(20) }),
} satisfies Definition;
const registry = { defs: [collection, single] };
const variantIssues = (screen: ScreenLike) =>
  checkScreen(screen, registry)
    .filter((issue) => /^S\.(hero|cover|highlight)_over$/.test(issue.code))
    .map(({ code, address }) => [code, address]);

it("allows one hero and one cover collection, ignores lone images, and reports each extra", () => {
  const screen: ScreenLike = {
    id: "home",
    components: [
      { id: "s1", c: "Single", emphasis: "hero", media: "cover", title: "One" },
      { id: "c1", c: "Collection", rows: [] },
      { id: "c2", c: "col_lection", emphasis: "hero", media: "cover", rows: [] },
      { id: "c3", c: "Collection", media: "thumb", rows: [] },
      { id: "s2", c: "Single", emphasis: "hero", title: "Two" },
    ],
  };
  const before = structuredClone(screen);
  expect(variantIssues(screen)).toEqual([
    ["S.hero_over", "home/c2/root"],
    ["S.cover_over", "home/c2/root"],
    ["S.hero_over", "home/s2/root"],
  ]);
  expect(screen).toEqual(before);
});

it.each([1, 2, 3, 5, 6])("rounds the highlight allowance down for %i rows", (count) => {
  const rows = Array.from({ length: count }, (_, i) => ({ title: `Row ${i}`, mark: "highlight" }));
  expect(variantIssues({ id: "home", components: [{ id: "a", c: "Collection", rows }] })).toEqual(
    rows
      .slice(Math.floor(count / 3))
      .map((_, i) => ["S.highlight_over", `home/a/p${Math.floor(count / 3) + i + 1}/root`]),
  );
});

it("counts only the declared, applied variants and resets the item cap per collection", () => {
  const rows = [{ title: "One", mark: "highlight" }, { title: "Two" }, { title: "Three", mark: "new" }];
  const screen = {
    id: "home",
    components: [
      { id: "a", c: "Collection", rows },
      { id: "b", c: "Collection", media: "thumb", rows },
      { id: "c", c: "Missing", emphasis: "hero", media: "cover", rows },
      { id: "d", c: "Single", emphasis: "hero", title: "One" },
    ],
  };
  expect(variantIssues(screen)).toEqual([]);
});

import { expect, it } from "vitest";
import { z } from "zod";
import {
  components,
  itemVariantProps,
  planAct,
  readComponent,
  repairVariants,
  text,
  variantProps,
  type Definition,
} from "@lmthing/ui/catalog";

const variants = { detail: ["full", "brief"], trail: ["chevron", "toggle"] } as const;
const itemAxes = { trail: ["chevron", "toggle"], mark: ["none", "highlight"] } as const;
const list = {
  ...components.List,
  meta: {
    ...components.List.meta,
    variants,
    items: { ...components.List.meta.items, variants: itemAxes },
    actions: { items: { trail: ["toggle"] }, when: { trail: { trail: "toggle" } } },
  },
  props: z.strictObject({
    ...variantProps(variants),
    rows: z.array(
      z.strictObject({
        title: text(28),
        ...itemVariantProps(itemAxes, { inheritTrail: true }),
      }),
    ),
  }),
} as const satisfies Definition;

it("defaults invalid declared values and removes inapplicable flat axes without mutation", () => {
  const input = {
    detail: 2,
    emphasis: "hero",
    trail: "toggle",
    rows: [{ title: "Fern", trail: "badge", mark: "glow", tone: "good" }, { title: "Basil" }],
  };
  const before = structuredClone(input);
  const result = repairVariants(list, input);
  expect(result).toEqual({
    props: {
      detail: "full",
      trail: "toggle",
      rows: [{ title: "Fern", trail: "chevron", mark: "none" }, { title: "Basil" }],
    },
    codes: Array(5).fill("R2.variant"),
  });
  expect(list.props.safeParse(input).success).toBe(false);
  expect(list.props.safeParse(result.props).success).toBe(true);
  expect(input).toEqual(before);
});

it("preserves valid values, omissions, and fields with established non-variant meanings", () => {
  const input = { rows: [{ title: "Fern", mark: "highlight" }] };
  expect(repairVariants(list, input).props).toBe(input);
  expect(list.props.parse(repairVariants(list, input).props)).toHaveProperty("detail", "full");
  expect(repairVariants(list, { ...input, detail: undefined, emphasis: undefined })).toEqual({
    props: { ...input, detail: undefined },
    codes: ["R2.variant"],
  });
  const legacy = { rows: [{ title: "Fern", trail: "toggle" }] };
  expect(repairVariants(components.List, legacy)).toEqual({ props: legacy, codes: [] });
  const card = { title: "Fern", style: "tinted", tone: "good", typo: "untouched" };
  expect(repairVariants(components.Card, card)).toEqual({ props: card, codes: [] });
  expect(components.Card.props.safeParse(repairVariants(components.Card, card).props).success).toBe(false);
});

it("uses repaired variants when reading or planning actions", () => {
  const input = { trail: "toggle", rows: [{ title: "Fern", trail: "badge" }, { title: "Basil" }] };
  const screen = { id: "home", components: [{ id: "l1", c: "List", ...input }] };
  expect(readComponent(list, input, "l1")).toEqual([
    "l1 List",
    '  r1 "Fern"',
    '  r2 "Basil" [l1/r2/trail toggle]',
  ]);
  expect(planAct(screen, { List: list }, {}, [{ address: "l1/r1/trail", action: "toggle" }]).ok).toBe(false);
  expect(planAct(screen, { List: list }, {}, [{ address: "l1/r2/trail", action: "toggle" }]).ok).toBe(true);
});

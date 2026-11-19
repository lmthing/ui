import { expect, it } from "vitest";
import { z } from "zod";
import { components } from "@lmthing/ui/catalog";
import { variantProps, itemVariantProps } from "../props";
import type { Variants, VariantParts } from "../types";
import type { Definition } from "../probes";
import { checkVariantDeclarations } from "./check-variant-declarations";

const variants = { surface: ["card", "plain"], detail: ["full", "brief"] } as const;
const itemAxes = { trail: ["chevron", "toggle"], mark: ["none", "highlight"] } as const;
const fixture: Definition = {
  ...components.List,
  meta: {
    ...components.List.meta,
    id: "VariantFixture",
    variants,
    items: { key: "rows", parts: ["title", "trail"], variants: itemAxes },
    variantParts: { "trail.toggle": { adds: ["trail"] } },
  },
  props: z.strictObject({
    ...variantProps(variants),
    rows: z.array(z.strictObject({ ...itemVariantProps(itemAxes) })),
  }),
};

it("checks the metadata against the flat component and item schemas", () => {
  expect(checkVariantDeclarations(fixture)).toEqual([]);
  const bad = {
    ...fixture,
    props: fixture.props.extend({ surface: z.enum(["card", "plain"]).default("plain") }),
  };
  expect(checkVariantDeclarations(bad)).toContain(
    "VariantFixture: schema does not match declared variant surface",
  );
});

it("accepts inherited item trail only when the collection declares a trail", () => {
  const trail = { trail: ["chevron", "toggle"] } as const;
  const inherited: Definition = {
    ...fixture,
    props: fixture.props.extend({
      ...variantProps(trail),
      rows: z.array(z.strictObject(itemVariantProps(itemAxes, { inheritTrail: true }))),
    }),
  };
  expect(checkVariantDeclarations(inherited)).toContain(
    "VariantFixture items: schema does not match declared variant trail",
  );
  expect(
    checkVariantDeclarations({
      ...inherited,
      meta: { ...inherited.meta, variants: { ...variants, ...trail } },
    }),
  ).toEqual([]);
});

it("rejects unknown axes, empty options, bad values and disallowed item axes", () => {
  const bad = {
    ...fixture,
    meta: {
      ...fixture.meta,
      variants: { appearance: ["custom"], surface: [], detail: ["full", "extra"] } as unknown as Variants,
      items: { ...fixture.meta.items!, variants: { density: ["comfortable"] } as unknown as typeof itemAxes },
    },
  };
  expect(checkVariantDeclarations(bad)).toEqual(
    expect.arrayContaining([
      "VariantFixture: unknown variant axis appearance",
      "VariantFixture: empty variant axis surface",
      "VariantFixture: invalid variant values for detail: full, extra",
      "VariantFixture items: unknown variant axis density",
    ]),
  );
});

it("rejects declarations for undeclared values and finish part changes", () => {
  const bad = {
    ...fixture,
    meta: {
      ...fixture.meta,
      variantParts: {
        "surface.plain": { hides: ["title"] },
        "trail.check": { adds: ["trail"] },
      } satisfies VariantParts,
    },
  };
  expect(checkVariantDeclarations(bad)).toEqual([
    "VariantFixture: finish variant surface.plain cannot change parts",
    "VariantFixture: variantParts references undeclared trail.check",
  ]);
});

it("rejects duplicate style vocabulary outside the temporary existing-component allowlist", () => {
  for (const value of ["compact", "tinted", "outlined", "centered", "hero", "square", "wide", "tall"]) {
    const bad = {
      ...fixture,
      props: fixture.props.extend({ style: z.enum(["different", value]).default("different") }),
    };
    expect(checkVariantDeclarations(bad)).toEqual([
      `VariantFixture: style.${value} duplicates a shared variant`,
    ]);
  }
  expect(Object.values(components).flatMap(checkVariantDeclarations)).toEqual([]);
});

import { expect, it } from "vitest";
import { z } from "zod";
import { components } from "@lmthing/ui/catalog";
import { variantProps, itemVariantProps } from "../props";
import type { Variants, VariantParts } from "../types";
import type { Definition } from "../probes";
import { checkVariantDeclarations } from "./check-variant-declarations";

const variants = { emphasis: ["normal", "hero"], detail: ["full", "brief"] } as const;
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
    props: fixture.props.extend({ emphasis: z.enum(["normal", "hero"]).default("hero") }),
  };
  expect(checkVariantDeclarations(bad)).toContain(
    "VariantFixture: schema does not match declared variant emphasis",
  );
});

it("rejects helper-generated variant fields absent from component or item metadata", () => {
  const extra = {
    ...fixture,
    props: fixture.props.extend({
      ...variantProps({ aspect: ["wide", "square"] }),
      rows: z.array(z.strictObject(itemVariantProps({ ...itemAxes, tone: ["neutral", "good"] }))),
    }),
  };
  expect(checkVariantDeclarations(extra).sort()).toEqual([
    "VariantFixture items: schema exposes undeclared variant tone",
    "VariantFixture: schema exposes undeclared variant aspect",
  ]);
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

it("rejects variant fields inside nested objects and item sub-objects", () => {
  const nested = z.strictObject(variantProps({ aspect: ["wide", "square"] }));
  const def = {
    ...fixture,
    props: fixture.props.extend({
      preview: nested,
      rows: z.array(z.strictObject({ ...itemVariantProps(itemAxes), preview: nested })),
    }),
  };
  expect(checkVariantDeclarations(def).sort()).toEqual([
    "VariantFixture items.preview: schema exposes undeclared variant aspect",
    "VariantFixture.preview: schema exposes undeclared variant aspect",
  ]);
});

it("rejects an axis that offers only its default", () => {
  const def = {
    ...fixture,
    meta: { ...fixture.meta, variants: { ...variants, emphasis: ["normal"] } as const },
    props: fixture.props.extend(variantProps({ emphasis: ["normal"] })),
  };
  expect(checkVariantDeclarations(def)).toEqual(["VariantFixture: variant emphasis has no alternative"]);
});

it("rejects retired presentation properties even through nullable or union wrappers", () => {
  const density = z.enum(["comfortable", "compact"]);
  for (const wrapped of [density.nullable(), z.union([z.null(), density])]) {
    const def = { ...fixture, props: fixture.props.extend({ density: wrapped }) };
    expect(checkVariantDeclarations(def)).toEqual([
      "VariantFixture: schema exposes retired presentation prop density",
    ]);
  }
});

it("rejects style duplicates in wrapped enums and union literals", () => {
  for (const style of [
    z.enum(["other", "hero"]).nullable().default("other"),
    z.union([z.literal("other"), z.literal("hero")]),
  ]) {
    const def = { ...fixture, props: fixture.props.extend({ style }) };
    expect(checkVariantDeclarations(def)).toEqual(["VariantFixture: style.hero duplicates a shared variant"]);
  }
});

it("rejects unknown axes, empty options, bad values and disallowed item axes", () => {
  const bad = {
    ...fixture,
    meta: {
      ...fixture.meta,
      variants: { appearance: ["custom"], emphasis: [], detail: ["full", "extra"] } as unknown as Variants,
      items: { ...fixture.meta.items!, variants: { density: ["comfortable"] } as unknown as typeof itemAxes },
    },
  };
  expect(checkVariantDeclarations(bad)).toEqual(
    expect.arrayContaining([
      "VariantFixture: unknown variant axis appearance",
      "VariantFixture: empty variant axis emphasis",
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
        "emphasis.hero": { hides: ["title"] },
        "trail.check": { adds: ["trail"] },
      } satisfies VariantParts,
    },
  };
  expect(checkVariantDeclarations(bad)).toEqual([
    "VariantFixture: finish variant emphasis.hero cannot change parts",
    "VariantFixture: variantParts references undeclared trail.check",
  ]);
});

it("rejects duplicate style vocabulary outside the temporary existing-component allowlist", () => {
  for (const value of ["centered", "hero", "square", "wide", "tall", "grid", "strip", "badge"]) {
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

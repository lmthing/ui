import { expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { buildEntry, writerFormatFor } from "@lmthing/ui/catalog";
import { variantProps, itemVariantProps } from "./variant-props";
import type { Definition } from "../../probes";

const props = z.strictObject({
  ...variantProps({
    density: ["comfortable", "compact"],
    emphasis: ["normal", "hero"],
    trail: ["chevron", "toggle"],
  }),
  rows: z.array(
    z.strictObject({
      title: z.string(),
      ...itemVariantProps(
        { trail: ["chevron", "toggle"], mark: ["none", "highlight"] },
        { inheritTrail: true },
      ),
    }),
  ),
});

const def = {
  meta: {
    id: "Example",
    purpose: "Show one example.",
    pick: "An example.",
    region: "body",
    group: "content",
    weight: 1,
    tier: "phone",
    realPath: "An example.",
    variants: {
      density: ["comfortable", "compact"],
      emphasis: ["normal", "hero"],
      trail: ["chevron", "toggle"],
    },
    items: {
      key: "rows",
      parts: ["root", "trail"],
      variants: { trail: ["chevron", "toggle"], mark: ["none", "highlight"] },
    },
  },
  props,
  examples: [{ rows: [{ title: "One" }] }],
  probes: [],
  fallback: () => ({ rows: [{ title: "One" }] }),
} as const satisfies Definition;

it("infers only the declared values and retains inheritance on omission", () => {
  expect(z.strictObject(itemVariantProps({ trail: ["chevron", "toggle"] })).parse({})).toEqual({
    trail: "chevron",
  });
  expectTypeOf<z.output<typeof props>["density"]>().toEqualTypeOf<"comfortable" | "compact" | undefined>();
  expectTypeOf<z.output<typeof props>["emphasis"]>().toEqualTypeOf<"normal" | "hero">();
  expectTypeOf<z.output<typeof props>["rows"][number]["trail"]>().toEqualTypeOf<
    "chevron" | "toggle" | undefined
  >();
  expect(props.parse(def.examples[0])).toEqual({
    emphasis: "normal",
    trail: "chevron",
    rows: [{ title: "One", mark: "none" }],
  });
  expect(props.parse({ density: "comfortable", rows: [{ title: "One", trail: "toggle" }] })).toEqual({
    density: "comfortable",
    emphasis: "normal",
    trail: "chevron",
    rows: [{ title: "One", trail: "toggle", mark: "none" }],
  });
});

it("rejects values and keys outside the declared flat shapes", () => {
  for (const input of [
    { ...def.examples[0], emphasis: "quiet" },
    { ...def.examples[0], surface: "card" },
    { ...def.examples[0], variants: { density: "compact" } },
    { rows: [{ title: "One", trail: "check" }] },
    { rows: [{ title: "One", tone: "good" }] },
  ])
    expect(props.safeParse(input).success).toBe(false);
});

it("exposes the same values in the prompt entry and strict writer schema", () => {
  const prompt = buildEntry(def);
  expect(prompt).toContain('emphasis?: normal|hero="normal"');
  expect(prompt).toContain("trail?: chevron|toggle");
  expect(prompt).not.toMatch(/quiet|surface|badge/);
  const schema = writerFormatFor(def).json_schema.schema;
  expect(schema.properties?.emphasis?.anyOf).toEqual([
    { type: "string", enum: ["normal", "hero"] },
    { type: "null" },
  ]);
  expect(schema.properties?.density?.anyOf).toEqual([
    { type: "string", enum: ["comfortable", "compact"] },
    { type: "null" },
  ]);
  expect(schema.properties?.surface).toBeUndefined();
  expect(schema.properties?.rows?.items?.properties?.trail?.anyOf).toEqual([
    { type: "string", enum: ["chevron", "toggle"] },
    { type: "null" },
  ]);
});

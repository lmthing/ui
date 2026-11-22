import { expect, it } from "vitest";
import { z } from "zod";
import { variantProps } from "../props";
import { scoreWrite } from "./score";
import type { Definition, WriteProbe } from "./types";

const variants = { detail: ["full", "brief"], emphasis: ["normal", "hero"] } as const;
const fixture = {
  meta: {
    id: "Fixture",
    group: "input",
    purpose: "Choose an option.",
    pick: "Choose one option.",
    region: "body",
    weight: 2,
    tier: "phone",
    realPath: "Saved on the device.",
    variants,
    items: { key: "options", parts: ["root"] },
  },
  props: z.strictObject({
    ...variantProps(variants),
    options: z.array(
      z.strictObject({
        title: z.string().optional(),
        label: z.string().optional(),
        name: z.string().optional(),
        limit: z.int().default(1),
      }),
    ),
  }),
  fallback: () => ({ options: [] }),
  examples: [],
  probes: [],
} as const satisfies Definition;
const ordered = {
  axis: "detail",
  value: "brief",
  itemTitles: ["Fern", "Basil"],
} as const satisfies NonNullable<WriteProbe["variant"]>;
const score = (options: unknown[], emphasis: string | null = null) =>
  scoreWrite(JSON.stringify({ c: "Fixture", detail: "brief", emphasis, options }), fixture, ordered);
const incorrect = { pass: false, detail: "expected items in order: Fern, Basil" };

it("checks item labels in order without relaxing other variant requirements", () => {
  const options = [{ label: " fern " }, { label: "Basil" }];
  expect(score(options)).toEqual({ pass: true, detail: "detail: brief" });
  expect(score(options, "hero")).toEqual({ pass: false, detail: "unrequested variant: emphasis" });
  expect(score([...options].reverse())).toEqual(incorrect);
  expect(score(options.slice(0, 1))).toEqual(incorrect);
  expect(score([options[0], {}])).toEqual(incorrect);
});

it("checks names in order when neither title nor label is present", () => {
  const options = [{ name: " fern " }, { name: "Basil" }];
  expect(score(options)).toEqual({ pass: true, detail: "detail: brief" });
  expect(score([...options].reverse())).toEqual(incorrect);
});

it("continues to prefer titles and then labels", () => {
  expect(score([{ title: " fern ", label: "Aloe", name: "Oak" }, { title: "Basil" }]).pass).toBe(true);
  expect(score([{ title: "Aloe", label: "Fern", name: "Fern" }, { title: "Basil" }])).toEqual(incorrect);
  expect(score([{ label: "Fern", name: "Aloe" }, { label: "Basil" }]).pass).toBe(true);
  expect(score([{ label: "Aloe", name: "Fern" }, { label: "Basil" }])).toEqual(incorrect);
});

it("requires the requested wire fields as well as a valid schema", () => {
  const fields = { "options.0.label": "Fern" };
  const check = (label: string | null, detail: string | null = "brief") =>
    scoreWrite(
      JSON.stringify({ c: "Fixture", detail, options: [{ label }, { label: "Basil" }] }),
      fixture,
      ordered,
      { options: [{}, { label: "Basil" }] },
      fields,
    );
  expect(check("Fern").pass).toBe(true);
  expect(check(null)).toEqual({ pass: false, detail: "expected options.0.label: Fern, got undefined" });
  expect(check("Aloe").pass).toBe(false);
  expect(check("Fern", null).pass).toBe(false);
});

it("checks requested values on authored rows, not schema defaults", () => {
  const check = (options: unknown[]) =>
    scoreWrite(JSON.stringify({ c: "Fixture", options }), fixture, undefined, { options: [{ limit: 1 }] });
  expect(check([{ label: "Basil", limit: 1 }]).pass).toBe(true);
  expect(check([{ label: "Basil" }])).toEqual({
    pass: false,
    detail: "missing or incorrect props.options.0.limit",
  });
  expect(check([{ limit: 1 }, { limit: 1 }]).pass).toBe(false);
});

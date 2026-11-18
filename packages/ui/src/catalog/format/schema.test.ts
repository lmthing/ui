import { expect, it } from "vitest";
import { z } from "zod";
import { inputSchema, strictSchema } from "./schema";

it("keeps Zod input constraints, not metadata, defaults or computed outputs", () => {
  const props = z
    .strictObject({
      label: z.string().min(1).max(8).meta({ kind: "text", max: 8 }),
      style: z.enum(["plain", "inset"]).default("plain"),
      rows: z
        .array(z.strictObject({ value: z.number().min(0).max(9), detail: z.string().optional() }))
        .min(1)
        .max(2),
    })
    .overwrite((value) => ({ ...value, computed: true }));
  const raw = inputSchema(props),
    schema = strictSchema(raw);
  expect(schema.properties?.label).toEqual({ type: "string", minLength: 1, maxLength: 8 });
  expect(schema.properties?.computed).toBeUndefined();
  expect(schema.properties?.style).toEqual({
    anyOf: [{ type: "string", enum: ["plain", "inset"] }, { type: "null" }],
  });
  expect(schema.required).toEqual(["label", "style", "rows"]);
  expect(schema.additionalProperties).toBe(false);
  expect(schema.properties?.rows).toMatchObject({ minItems: 1, maxItems: 2 });
  expect(schema.properties?.rows?.items?.required).toEqual(["value", "detail"]);
  expect(raw.required).toEqual(["label", "rows"]);
});

it("relaxes only length bounds on patterned strings rejected by the Azure decoder", () => {
  const schema = strictSchema(
    inputSchema(
      z.strictObject({
        goto: z
          .string()
          .max(64)
          .regex(/^[a-z][a-z0-9_]*$/),
        label: z.string().min(1).max(16),
      }),
    ),
  );
  expect(schema.properties?.goto).toEqual({ type: "string", pattern: "^[a-z][a-z0-9_]*$" });
  expect(schema.properties?.label).toEqual({ type: "string", minLength: 1, maxLength: 16 });
});

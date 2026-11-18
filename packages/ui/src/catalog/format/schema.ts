import { z } from "zod";

export type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  enum?: unknown[];
  const?: unknown;
  additionalProperties?: boolean;
  [key: string]: unknown;
};

/** Zod owns conversion. Input schemas exclude computed output fields and keep refinements in code. */
export function inputSchema(props: z.ZodObject): JsonSchema {
  return z.toJSONSchema(props, { io: "input", unrepresentable: "any", reused: "inline" }) as JsonSchema;
}

const keywords = new Set([
  "type",
  "properties",
  "required",
  "items",
  "anyOf",
  "enum",
  "const",
  "additionalProperties",
  "minLength",
  "maxLength",
  "pattern",
  "format",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minItems",
  "maxItems",
  "$ref",
  "$defs",
]);

/** All object keys are required in strict mode; null represents an absent optional input. */
export function strictSchema(raw: JsonSchema): JsonSchema {
  const schema = Object.fromEntries(Object.entries(raw).filter(([key]) => keywords.has(key))) as JsonSchema;
  // Azure's deployment returns choices:[] for pattern + length bounds, even on a single string.
  // Keep the vocabulary pattern; only these bounds move back to the unchanged Zod validator.
  if (schema.pattern) {
    delete schema.minLength;
    delete schema.maxLength;
  }
  if (raw.properties) {
    schema.properties = Object.fromEntries(
      Object.entries(raw.properties).map(([key, prop]) => {
        const value = strictSchema(prop);
        return [key, raw.required?.includes(key) ? value : { anyOf: [value, { type: "null" }] }];
      }),
    );
    schema.required = Object.keys(raw.properties);
    schema.additionalProperties = false;
  }
  if (raw.items) schema.items = strictSchema(raw.items);
  if (raw.anyOf) schema.anyOf = raw.anyOf.map(strictSchema);
  if (raw.$defs)
    schema.$defs = Object.fromEntries(
      Object.entries(raw.$defs as Record<string, JsonSchema>).map(([key, value]) => [
        key,
        strictSchema(value),
      ]),
    );
  return schema;
}

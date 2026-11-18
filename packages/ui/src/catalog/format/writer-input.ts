import type { Definition } from "../probes";
import { inputSchema, type JsonSchema } from "./schema";

function acceptsNull(schema: JsonSchema): boolean {
  return (
    schema.type === "null" ||
    (Array.isArray(schema.type) && schema.type.includes("null")) ||
    Boolean(schema.anyOf?.some(acceptsNull))
  );
}

function restore(value: unknown, schema: JsonSchema): unknown {
  if (Array.isArray(value)) return value.map((item) => restore(item, schema.items ?? {}));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) => {
      const prop = schema.properties?.[key];
      if (prop && item === null && !schema.required?.includes(key) && !acceptsNull(prop)) return [];
      return [[key, prop ? restore(item, prop) : item]];
    }),
  );
}

/** Decode strict-output optional nulls, without relaxing required fields, unknown keys or real nulls. */
export function writerInput(def: Definition, value: unknown): unknown {
  return restore(value, inputSchema(def.props));
}

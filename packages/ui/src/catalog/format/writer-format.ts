import type { Definition } from "../probes";
import { inputSchema, strictSchema, type JsonSchema } from "./schema";

export type WriterFormat = {
  type: "json_schema";
  json_schema: { name: string; strict: true; schema: JsonSchema };
};
type Registry = { ids: readonly string[]; defs: readonly Definition[] };

export function writerFormatFor(def: Definition): WriterFormat {
  if (def.meta.codeOwned) throw new Error(`${def.meta.id} is code-owned, not writable`);
  const schema = strictSchema(inputSchema(def.props));
  schema.properties = {
    c: { type: "string", const: def.meta.id, enum: [def.meta.id] },
    ...schema.properties,
  };
  schema.required = Object.keys(schema.properties);
  return { type: "json_schema", json_schema: { name: "writer_line", strict: true, schema } };
}

/** One line, scoped to exactly the registry's writable ids, with one branch per component. */
export function writerFormat(registry: Registry): WriterFormat {
  const defs = registry.ids
    .map((id) => {
      const def = registry.defs.find((entry) => entry.meta.id === id);
      if (!def) throw new Error(`No definition for registry id ${id}`);
      return def;
    })
    .filter((def) => !def.meta.codeOwned);
  if (!defs.length) throw new Error("Writer registry has no writable components");
  return {
    type: "json_schema",
    json_schema: {
      name: "writer_line",
      strict: true,
      schema: { type: "object", anyOf: defs.map((def) => writerFormatFor(def).json_schema.schema) },
    },
  };
}

import type { CoreArchetypeMeta as ArchetypeMeta } from "../archetypes";
import { writerFormat, writerInput, type WriterFormat } from "../format";
import type { ScreenLike } from "../agent";
import type { Definition } from "./types";

/** A compose probe writes a screen whose component lines use the same scoped Writer branches. */
export function composeFormat(
  meta: ArchetypeMeta,
  layout: string,
  defs: Record<string, Definition>,
): WriterFormat {
  const ids = [...new Set(meta.layouts[layout]!.slots.flatMap((slot) => [...slot.allow]))];
  const format = writerFormat({ ids, defs: ids.map((id) => defs[id]!) });
  const branches = format.json_schema.schema.anyOf!.map((schema) => ({
    ...schema,
    properties: { id: { type: "string", pattern: "^[a-z][a-z0-9_]*$" }, ...schema.properties },
    required: ["id", ...schema.required!],
  }));
  return {
    type: "json_schema",
    json_schema: {
      name: "writer_screen",
      strict: true,
      schema: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { anyOf: [{ type: "string" }, { type: "null" }] },
          components: { type: "array", items: { anyOf: branches } },
        },
        required: ["id", "title", "components"],
        additionalProperties: false,
      },
    },
  };
}

export function compositionInput(screen: ScreenLike, defs: Record<string, Definition>): ScreenLike {
  const { title, ...rest } = screen;
  return {
    ...rest,
    ...(title != null ? { title } : {}),
    components: screen.components.map((entry) =>
      defs[entry.c] ? (writerInput(defs[entry.c]!, entry) as typeof entry) : entry,
    ),
  };
}

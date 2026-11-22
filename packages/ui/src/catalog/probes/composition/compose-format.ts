import type { CoreArchetypeMeta as ArchetypeMeta } from "../../archetypes";
import { writerFormat, writerInput, type JsonSchema, type WriterFormat } from "../../format";
import type { ScreenLike } from "../../agent";
import type { Definition } from "..";

/** A generic progress slot can use either style, but bars retain their shorter label limit. */
function progressBranches(schema: JsonSchema): JsonSchema[] {
  const { properties } = schema;
  const bar = properties?.bars;
  const row = bar?.items;
  const label = row?.properties?.label;
  if (!properties || !bar || !row || !label) return [schema];
  return [
    {
      ...schema,
      properties: {
        ...properties,
        style: { anyOf: [{ type: "string", enum: ["bars"] }, { type: "null" }] },
        bars: {
          ...bar,
          items: { ...row, properties: { ...row.properties, label: { ...label, maxLength: 20 } } },
        },
      },
    },
    {
      ...schema,
      properties: {
        ...properties,
        style: { type: "string", enum: ["ring"] },
        bars: { ...bar, minItems: 1, maxItems: 1 },
      },
    },
  ];
}

/** A compose probe writes a screen whose component lines use the same scoped Writer branches. */
export function composeFormat(
  meta: ArchetypeMeta,
  layout: string,
  defs: Record<string, Definition>,
): WriterFormat {
  const slots = meta.layouts[layout]!.slots;
  const ids = [...new Set(slots.flatMap((slot) => [...slot.allow]))];
  const genericProgress = slots.some(({ allow, variant }) => allow.includes("Progress") && !variant);
  const format = writerFormat({ ids, defs: ids.map((id) => defs[id]!) });
  const branches = format.json_schema.schema.anyOf!.flatMap((schema) => {
    const entry = {
      ...schema,
      properties: { id: { type: "string", pattern: "^[a-z][a-z0-9_]*$" }, ...schema.properties },
      required: ["id", ...schema.required!],
    };
    return genericProgress && schema.properties?.c?.const === "Progress" ? progressBranches(entry) : [entry];
  });
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

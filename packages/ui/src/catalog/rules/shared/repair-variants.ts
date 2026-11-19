import { z } from "zod";
import type { JsonSchema } from "../../format";
import type { Definition } from "../../probes";
import { variantAxes } from "../../props";
import type { Axis, Variants } from "../../types";

const variantRepair = "R2.variant";
type Props = Record<string, unknown>;
const isProps = (value: unknown): value is Props =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function repairFields(
  input: Props,
  axes: Variants | undefined,
  fields: () => JsonSchema["properties"],
  codes: (typeof variantRepair)[],
): Props {
  let repaired = input;
  for (const [key, value] of Object.entries(input)) {
    if (!Object.hasOwn(variantAxes, key)) continue;
    const values: readonly string[] | undefined = axes?.[key as Axis];
    if (
      values
        ? value === undefined || (typeof value === "string" && values.includes(value))
        : Object.hasOwn(fields() ?? {}, key)
    )
      continue;
    if (repaired === input) repaired = { ...input };
    if (values) repaired[key] = values[0];
    else delete repaired[key];
    codes.push(variantRepair);
  }
  return repaired;
}

/** Run after migration and before strict validation. Existing non-variant schema fields stay untouched. */
export function repairVariants(
  def: Definition,
  input: unknown,
): {
  props: unknown;
  codes: (typeof variantRepair)[];
} {
  const codes: (typeof variantRepair)[] = [];
  if (!isProps(input)) return { props: input, codes };
  let schema: JsonSchema | undefined;
  const fields = () =>
    (schema ??= z.toJSONSchema(def.props, {
      io: "input",
      unrepresentable: "any",
      reused: "inline",
    }) as JsonSchema).properties;
  const { variants, items } = def.meta;
  const props = repairFields(input, variants, fields, codes);
  const rows = items && props[items.key];
  if (!items || !Array.isArray(rows)) return { props, codes };
  const repairedRows = rows.map((row: unknown) =>
    isProps(row)
      ? repairFields(row, items.variants, () => fields()?.[items.key]?.items?.properties, codes)
      : row,
  );
  return {
    props: repairedRows.some((row, index) => row !== rows[index])
      ? { ...props, [items.key]: repairedRows }
      : props,
    codes,
  };
}

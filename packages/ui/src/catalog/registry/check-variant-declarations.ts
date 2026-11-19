import { z } from "zod";
import type { Definition } from "../probes";
import { variantAxes } from "../props";
import type { Axis, ItemVariants, Variants } from "../types";

type Schema = {
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
};

const duplicateStyles = new Set([
  "compact",
  "tinted",
  "outlined",
  "centered",
  "hero",
  "square",
  "wide",
  "tall",
]);
const legacyStyles: Readonly<Partial<Record<string, Readonly<Record<string, string>>>>> = {
  Card: {
    tinted: "Pending surface migration in ui-variants-refs",
    outlined: "Pending surface migration in ui-variants-refs",
  },
  Profile: { centered: "Pending align migration in core adoption" },
  Photo: {
    square: "Pending aspect migration in core adoption",
    wide: "Pending aspect migration in core adoption",
    tall: "Pending aspect migration in core adoption",
  },
  Player: { compact: "Pending density migration in core adoption" },
  Progress: { compact: "Pending density migration in core adoption" },
  Payoff: { compact: "Pending density migration in money pack adoption" },
};
const itemAxes = { tone: true, mark: true, trail: true } satisfies Record<keyof ItemVariants, true>;

const choices = (field?: Schema) => field?.enum ?? (field?.const === undefined ? [] : [field.const]);

function checkAxes(
  label: string,
  axes: Variants | undefined,
  schema: Schema | undefined,
  item?: { mayInheritTrail: boolean },
) {
  return Object.entries(axes ?? {}).flatMap(([key, values]) => {
    if (!Object.hasOwn(variantAxes, key) || (item && !Object.hasOwn(itemAxes, key)))
      return [`${label}: unknown variant axis ${key}`];
    if (!Array.isArray(values) || !values.length) return [`${label}: empty variant axis ${key}`];
    const allowed: readonly unknown[] = variantAxes[key as Axis].values;
    if (values.some((value) => !allowed.includes(value)) || new Set(values).size !== values.length)
      return [`${label}: invalid variant values for ${key}: ${values.join(", ")}`];
    const field = schema?.properties?.[key];
    const options = choices(field);
    const fallback = key === "density" ? undefined : values[0];
    const defaultMatches =
      field?.default === fallback ||
      (item?.mayInheritTrail && key === "trail" && field?.default === undefined);
    if (
      options.length !== values.length ||
      !values.every((value, index) => options[index] === value) ||
      !defaultMatches ||
      schema?.required?.includes(key)
    )
      return [`${label}: schema does not match declared variant ${key}`];
    return [];
  });
}

/** Check the static contract at build time. The visual conformance gate checks actual effects. */
export function checkVariantDeclarations(def: Definition): string[] {
  const { meta, props } = def;
  const schema = z.toJSONSchema(props, { io: "input", unrepresentable: "any" }) as Schema;
  const itemSchema = meta.items && schema.properties?.[meta.items.key]?.items;
  return [
    ...checkAxes(meta.id, meta.variants, schema),
    ...checkAxes(`${meta.id} items`, meta.items?.variants, itemSchema, {
      mayInheritTrail: !!meta.variants?.trail,
    }),
    ...choices(schema.properties?.style).flatMap((value) =>
      typeof value === "string" && duplicateStyles.has(value) && !legacyStyles[meta.id]?.[value]
        ? [`${meta.id}: style.${value} duplicates a shared variant`]
        : [],
    ),
    ...Object.keys(meta.variantParts ?? {}).flatMap((key) => {
      const [axis, value, extra] = key.split(".") as [Axis, string, string?];
      if (!Object.hasOwn(variantAxes, axis) || extra !== undefined)
        return [`${meta.id}: variantParts references undeclared ${key}`];
      const allowed: readonly string[] = [
        ...(meta.variants?.[axis] ?? []),
        ...(meta.items?.variants?.[axis as keyof ItemVariants] ?? []),
      ];
      if (!allowed.includes(value)) return [`${meta.id}: variantParts references undeclared ${key}`];
      return variantAxes[axis].kind === "finish"
        ? [`${meta.id}: finish variant ${key} cannot change parts`]
        : [];
    }),
  ];
}

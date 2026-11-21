import { z } from "zod";
import type { Definition } from "../probes";
import { variantAxes } from "../props";
import type { Axis, ItemVariants, Variants } from "../types";

type Schema = {
  properties?: Record<string, Schema>;
  items?: Schema;
  anyOf?: Schema[];
  oneOf?: Schema[];
  allOf?: Schema[];
  required?: string[];
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  variantAxis?: string;
};

const duplicateStyles = new Set<string>([
  ...Object.values(variantAxes).flatMap(({ values }) => [...values]),
  "centered", // Legacy spelling of align.center.
]);
const legacyStyles: Readonly<Partial<Record<string, Readonly<Record<string, string>>>>> = {
  Card: {
    plain: "Pending surface migration in ui-variants-refs",
    tinted: "Pending surface migration in ui-variants-refs",
    outlined: "Pending surface migration in ui-variants-refs",
  },
  List: { plain: "Pending surface migration in ui-variants-refs", inset: "Pending shared surface migration" },
  Gallery: { grid: "Pending arrange migration", strip: "Pending arrange migration" },
  KeyValue: { rows: "Pending arrange migration", grid: "Pending arrange migration" },
  People: { rows: "Pending arrange migration" },
  Hero: { number: "Headline content kind, not numbered leading accessories" },
  Profile: { centered: "Pending align migration in core adoption" },
  Photo: {
    square: "Pending aspect migration in core adoption",
    wide: "Pending aspect migration in core adoption",
    tall: "Pending aspect migration in core adoption",
  },
  Player: { compact: "Pending density migration in core adoption" },
  Progress: { compact: "Pending density migration in core adoption" },
  Appointment: {
    card: "Action-bearing layout, not just surface treatment",
    compact: "Single-row booking overview, independent of spacing density",
  },
  ServiceMenu: { rows: "Pending booking pack variant adoption" },
  Slots: { grid: "Pending arrange migration in booking pack" },
  Payoff: { compact: "Pending density migration in money pack adoption" },
  ScoreSheet: { grid: "Multi-round editing structure, not a generic collection grid" },
  Spinner: { strip: "Wheel alternative changes the draw mechanism, not collection arrangement" },
  Trivia: { card: "Question and answer reveal layout, not just surface treatment" },
  PassCard: { card: "Membership layout versus coupon, centered code, or transit balance" },
  FileList: { rows: "Grouped attachments with inline metadata, not separate cards with page badges" },
};
const itemAxes = { tone: true, mark: true, trail: true } satisfies Record<keyof ItemVariants, true>;

const choices = (field?: Schema) => field?.enum ?? (field?.const === undefined ? [] : [field.const]);
const branchesOf = (schema: Schema) => [
  ...(schema.anyOf ?? []),
  ...(schema.oneOf ?? []),
  ...(schema.allOf ?? []),
];

/** Schema wrappers keep scalar metadata and values on their branches, not the containing property. */
function scalarBranches(schema: Schema): Schema[] {
  return [schema, ...branchesOf(schema).flatMap(scalarBranches)];
}

function checkSchemaAxes(
  label: string,
  axes: Variants | undefined,
  schema: Schema | undefined,
  item?: { key: string; variants?: ItemVariants },
): string[] {
  if (!schema) return [];
  const fields = Object.entries(schema.properties ?? {}).flatMap(([key, field]) => {
    const misplaced = scalarBranches(field).some(
      ({ variantAxis }) => variantAxis && (variantAxis !== key || !Object.hasOwn(axes ?? {}, key)),
    );
    const issues = misplaced ? [`${label}: schema exposes undeclared variant ${key}`] : [];
    if (key !== item?.key) return [...issues, ...checkSchemaAxes(`${label}.${key}`, undefined, field)];
    const { items, ...container } = field;
    return [
      ...issues,
      ...checkSchemaAxes(`${label}.${key}`, undefined, container),
      ...checkSchemaAxes(`${label} items`, item.variants, items),
    ];
  });
  return [
    ...fields,
    ...checkSchemaAxes(`${label}[]`, undefined, schema.items),
    ...branchesOf(schema).flatMap((branch) => checkSchemaAxes(label, undefined, branch)),
  ];
}

function checkDuplicateStyles(id: string, field?: Schema): string[] {
  const values = new Set(field ? scalarBranches(field).flatMap(choices) : []);
  return [...values].flatMap((value) =>
    typeof value === "string" && duplicateStyles.has(value) && !legacyStyles[id]?.[value]
      ? [`${id}: style.${value} duplicates a shared variant`]
      : [],
  );
}

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
    if (values.length === 1) return [`${label}: variant ${key} has no alternative`];
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
  const schema = z.toJSONSchema(props, { io: "input", unrepresentable: "any", reused: "inline" }) as Schema;
  const itemSchema = meta.items && schema.properties?.[meta.items.key]?.items;
  return [
    ...checkAxes(meta.id, meta.variants, schema),
    ...checkSchemaAxes(meta.id, meta.variants, schema, meta.items),
    ...checkAxes(`${meta.id} items`, meta.items?.variants, itemSchema, {
      mayInheritTrail: !!meta.variants?.trail,
    }),
    ...checkDuplicateStyles(meta.id, schema.properties?.style),
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

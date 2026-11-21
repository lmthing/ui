import type { ReadSchema } from "./index";

export const secretPlaceholder = "(secret)";

function redact(schema: ReadSchema, value: unknown): unknown {
  if (schema.kind === "secret" && typeof value === "string" && value.trim()) return secretPlaceholder;
  if (schema.anyOf) return schema.anyOf.reduce((current, option) => redact(option, current), value);
  if (Array.isArray(value) && schema.items) {
    const rows = value.map((item) => redact(schema.items!, item));
    return rows.some((item, index) => item !== value[index]) ? rows : value;
  }
  return value && typeof value === "object" && schema.properties
    ? redactSecretProps(schema, value as Record<string, unknown>)
    : value;
}

/** Custom readings receive the same secret placeholder as the generic reading. */
export function redactSecretProps(schema: ReadSchema, props: Record<string, unknown>) {
  let safe = props;
  for (const [key, field] of Object.entries(schema.properties ?? {})) {
    const value = redact(field, props[key]);
    if (value !== props[key]) {
      if (safe === props) safe = { ...props };
      safe[key] = value;
    }
  }
  return safe;
}

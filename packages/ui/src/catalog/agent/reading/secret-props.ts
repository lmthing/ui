import type { Meta } from "../../meta";
import type { SessionState } from "../session";
import type { ReadSchema } from "./index";

export const secretPlaceholder = "(secret)";

function matchesLiterals(schema: ReadSchema, value: unknown) {
  if (Object.hasOwn(schema, "const") && schema.const !== value) return false;
  if (!value || typeof value !== "object" || !schema.properties) return true;
  const props = value as Record<string, unknown>;
  return Object.entries(schema.properties).every(
    ([key, field]) =>
      !Object.hasOwn(field, "const") || !Object.hasOwn(props, key) || field.const === props[key],
  );
}

function redact(schema: ReadSchema, value: unknown): unknown {
  if (schema.kind === "secret" && typeof value === "string" && value.trim()) return secretPlaceholder;
  if (Array.isArray(value) && schema.items) {
    const before = value;
    const rows = before.map((item) => redact(schema.items!, item));
    if (rows.some((item, index) => item !== before[index])) value = rows;
  } else if (value && typeof value === "object" && schema.properties) {
    value = redactSecretProps(schema, value as Record<string, unknown>);
  }
  const alternatives = schema.oneOf ?? schema.anyOf;
  const matching = alternatives?.filter((option) => matchesLiterals(option, value));
  for (const option of matching?.length ? matching : (alternatives ?? [])) value = redact(option, value);
  for (const option of schema.allOf ?? []) value = redact(option, value);
  return value;
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

export const roundHide = (meta: Meta) => meta.session?.kind === "rounds" && meta.session.hide !== undefined;

/** Omit hidden fields and redact the active round in both copies seen by the reader. */
export function sessionForRead(meta: Meta, schema: ReadSchema, session: SessionState | undefined) {
  if (meta.session?.kind !== "rounds" || session?.kind !== "rounds") return session;
  const hidden = roundHide(meta) ? meta.session.hidden : meta.session.assessment?.readHidden;
  const visible = hidden?.length
    ? Object.fromEntries(Object.entries(session.item).filter(([key]) => !hidden.includes(key)))
    : session.item;
  const collection = schema.properties?.[meta.session.items];
  const item = collection ? (redact(collection, [visible]) as (typeof visible)[])[0]! : visible;
  return item === session.item ? session : { ...session, item };
}

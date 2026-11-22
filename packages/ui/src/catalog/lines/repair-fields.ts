import { clip } from "../cast";
import type { JsonSchema } from "../format";
import { iconTable, type IconName } from "../icons";
import { lineCodes as code, type LineCode } from "./codes";

type Values = Record<string, unknown>;
type Repairs = { codes: Set<LineCode>; photoTags?: readonly string[] | undefined };

export function isValues(value: unknown): value is Values {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

const normalized = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

function distance(left: string, right: string): number {
  let row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 0; i < left.length; i++) {
    const next = [i + 1];
    for (let j = 0; j < right.length; j++) {
      next.push(Math.min(next[j]! + 1, row[j + 1]! + 1, row[j]! + Number(left[i] !== right[j])));
    }
    row = next;
  }
  return row[right.length]!;
}

function nearest(value: string, choices: readonly string[], limit = Infinity): string | undefined {
  const name = normalized(value);
  if (name.length > 64) return;
  let best: string | undefined,
    score = limit + 1;
  for (const choice of choices) {
    const cost = distance(name, normalized(choice));
    if (cost < score) {
      best = choice;
      score = cost;
    }
  }
  return best;
}

function snapIcon(value: string, choices: readonly string[]): string | undefined {
  const input = normalized(value);
  const synonym = input && choices.find((name) => normalized(iconTable[name as IconName] ?? "") === input);
  return (
    (synonym || (input ? nearest(value, choices, 2) : undefined)) ?? choices.find((name) => name === "dot")
  );
}

function snapPhoto(value: string, tags: readonly string[] | undefined): string | undefined {
  const ref = value.trim().toLowerCase();
  if (/^local:[1-9][0-9]*$/.test(ref)) return ref;
  const tag = ref.replace(/^lib:/, "").replace(/[\s-]+/g, "_");
  if (!/^[a-z][a-z0-9_]*$/.test(tag)) return;
  const snapped = tags ? nearest(tag, tags, 2) : tag;
  return snapped ? `lib:${snapped}` : undefined;
}

function scalar(value: unknown, shape: JsonSchema, ctx: Repairs): unknown {
  const { kind, maxLength, max, enum: choices } = shape;
  if (choices && !choices.includes(value) && choices.every((choice) => typeof choice === "string")) {
    const picked =
      typeof value === "string"
        ? kind === "icon"
          ? snapIcon(value, choices)
          : nearest(value, choices)
        : undefined;
    if (picked !== undefined) ctx.codes.add(kind === "icon" ? code.icon : code.enum);
    return picked;
  }
  if (typeof value !== "string") return value;
  if (kind === "photo" && !/^(?:lib:[a-z][a-z0-9_]*|local:[1-9][0-9]*)$/.test(value)) {
    const picked = snapPhoto(value, ctx.photoTags);
    if (picked) ctx.codes.add(code.photo);
    return picked;
  }
  const limit = typeof maxLength === "number" ? maxLength : max;
  const text = value.trim();
  if ((kind === "text" || !shape.pattern) && typeof limit === "number" && text.length > limit) {
    ctx.codes.add(code.text);
    return /\s/.test(text[limit] ?? "") ? text.slice(0, limit) : clip(text, limit);
  }
  return value;
}

function compatible(value: unknown, shape: JsonSchema): boolean {
  if (shape.const !== undefined) return value === shape.const;
  if (shape.enum && !shape.enum.includes(value)) return false;
  const type = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
  const types = Array.isArray(shape.type) ? shape.type : shape.type ? [shape.type] : [];
  if (types.length && !types.includes(type) && !(types.includes("integer") && Number.isInteger(value)))
    return false;
  if (typeof value === "number")
    return (
      Number.isFinite(value) &&
      (typeof shape.minimum !== "number" || value >= shape.minimum) &&
      (typeof shape.maximum !== "number" || value <= shape.maximum) &&
      (typeof shape.exclusiveMinimum !== "number" || value > shape.exclusiveMinimum) &&
      (typeof shape.exclusiveMaximum !== "number" || value < shape.exclusiveMaximum)
    );
  if (typeof value === "string") {
    const text = shape.kind === "text" ? value.trim() : value;
    return (
      (typeof shape.minLength !== "number" || text.length >= shape.minLength) &&
      (typeof shape.maxLength !== "number" || text.length <= shape.maxLength) &&
      (typeof shape.pattern !== "string" || new RegExp(shape.pattern).test(value))
    );
  }
  return true;
}

function repairArray(value: unknown[], shape: JsonSchema, fallback: unknown, ctx: Repairs): unknown[] {
  const defaults: unknown[] = Array.isArray(fallback) ? fallback : [];
  const max = typeof shape.maxItems === "number" ? shape.maxItems : value.length;
  const min = typeof shape.minItems === "number" ? shape.minItems : 0;
  if (value.length > max) ctx.codes.add(code.array);
  const items = value.slice(0, max).flatMap<unknown>((item, at) => {
    const fixed = repairField(item, shape.items ?? {}, defaults[at], true, ctx);
    return fixed === undefined ? [] : [fixed];
  });
  if (items.length < Math.min(min, defaults.length)) {
    ctx.codes.add(code.fill);
    items.push(...defaults.slice(items.length, min));
  }
  return items;
}

function repairField(
  value: unknown,
  shape: JsonSchema,
  fallback: unknown,
  required: boolean,
  ctx: Repairs,
): unknown {
  if (shape.anyOf) {
    for (const option of shape.anyOf) {
      const codes = new Set<LineCode>();
      const result = repairField(value, option, undefined, false, { ...ctx, codes });
      if (result !== undefined && compatible(result, option)) {
        codes.forEach((entry) => ctx.codes.add(entry));
        return result;
      }
    }
  } else if (value !== undefined && (value !== null || compatible(value, shape))) {
    if (isValues(value) && shape.properties) return repairFields(value, shape, fallback, ctx);
    if (Array.isArray(value) && shape.items) return repairArray(value, shape, fallback, ctx);
    const fixed = scalar(value, shape, ctx);
    if (fixed !== undefined && compatible(fixed, shape)) return fixed;
  }
  if (required && fallback !== undefined) {
    ctx.codes.add(code.fill);
    return fallback;
  }
  if (value !== undefined) ctx.codes.add(code.strip);
}

export function repairFields(value: Values, shape: JsonSchema, fallback: unknown, ctx: Repairs): Values {
  const defaults = isValues(fallback) ? fallback : {};
  const fields = shape.properties ?? {};
  for (const key of Object.keys(value)) if (!Object.hasOwn(fields, key)) ctx.codes.add(code.strip);
  return Object.fromEntries(
    Object.entries(fields).flatMap(([key, field]) => {
      const fixed = repairField(
        Object.hasOwn(value, key) ? value[key] : undefined,
        field,
        Object.hasOwn(defaults, key) ? defaults[key] : undefined,
        shape.required?.includes(key) ?? false,
        ctx,
      );
      return fixed === undefined ? [] : [[key, fixed]];
    }),
  );
}

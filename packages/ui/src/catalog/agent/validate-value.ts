// Checks the value an action carries, before anything changes. Errors say the allowed format in
// under 10 words (plan 4.12).
import { localeOf } from "../lang";
import type { Meta } from "../meta";
import type { Values } from "./act";

export type ValueError = { code: "invalid_value"; hint: string };

const invalid = (hint: string): ValueError => ({ code: "invalid_value", hint });
// The decimal keypad uses ASCII decimal drafts, not localized display notation.
const plainDecimal = new Intl.NumberFormat(localeOf(), { useGrouping: false, maximumSignificantDigits: 21 });

function decimalText(value: number) {
  return plainDecimal.format(value === 0 ? 0 : value);
}

function exceeds(text: string, max: number) {
  if (max < 0) return true;
  // Compare decimal digits so rounding cannot hide an amount just over max.
  const digits = (value: string) => {
    const [whole, fraction = ""] = value.split(".");
    return [whole!.replace(/^0+/, ""), fraction.replace(/0+$/, "")] as const;
  };
  const [whole, fraction] = digits(text);
  const [limit, limitFraction] = digits(decimalText(max));
  if (whole.length !== limit.length) return whole.length > limit.length;
  return whole === limit ? fraction > limitFraction : whole > limit;
}

/** Keypad edits preserve drafts (including a trailing separator); plain strings replace them. */
export function resolveKeypadValue(
  value: unknown,
  current: unknown,
  limits: { max?: unknown; decimals?: unknown },
): { value: string } | ValueError {
  const before = typeof current === "number" ? decimalText(current) : String(current ?? "");
  let text: string;
  if (typeof value === "string") text = value;
  else if (value && typeof value === "object" && Object.keys(value).length === 1) {
    if ("append" in value && typeof value.append === "string" && /^[0-9.]$/.test(value.append))
      text = before + value.append;
    else if ("backspace" in value && value.backspace === true) text = before.slice(0, -1);
    else if ("clear" in value && value.clear === true) text = "";
    else return invalid("Use a digit, separator, backspace, or clear");
  } else return invalid("type takes decimal text or a keypad edit");
  if (!/^[0-9]*(?:\.[0-9]*)?$/.test(text)) return invalid("Use digits and one decimal point");
  const [whole, fraction] = text.split(".");
  if (typeof limits.decimals === "number" && fraction !== undefined) {
    if (limits.decimals === 0) return invalid("Use a whole number");
    if (fraction.length > limits.decimals) return invalid(`Use at most ${limits.decimals} decimal places`);
  }
  const amount = `${whole || "0"}.${fraction ?? ""}`;
  if (!Number.isFinite(Number(amount))) return invalid("Use a finite amount");
  if (typeof limits.max === "number" && exceeds(amount, limits.max))
    return invalid(`Use ${limits.max} or less`);
  return { value: text };
}

const none = (value: unknown) => value === undefined;

const rules: Record<string, [check: (value: unknown) => boolean, hint: string]> = {
  flip: [none, "flip takes no value"],
  scan: [none, "scan takes no value"],
  move: [(v) => typeof v === "string", "move takes a label"],
  press: [none, "press takes no value"],
  start: [none, "start takes no value"],
  stop: [none, "stop takes no value"],
  dismiss: [none, "dismiss takes no value"],
  send: [none, "send takes no value"],
  play: [none, "play takes no value"],
  pause: [none, "pause takes no value"],
  seek: [(v) => typeof v === "number" && Number.isFinite(v) && v >= 0, "seek takes seconds, 0 or more"],
  increment: [none, "increment takes no value"],
  decrement: [none, "decrement takes no value"],
  toggle: [(v) => none(v) || typeof v === "boolean", "toggle takes nothing or true/false"],
  check: [(v) => none(v) || typeof v === "boolean", "check takes nothing or true/false"],
  select: [
    (v) => (typeof v === "number" && Number.isFinite(v)) || (typeof v === "string" && v.length > 0),
    "select takes an index or a label",
  ],
  type: [(v) => typeof v === "string", "type takes text"],
  set: [
    (v) => (typeof v === "number" && Number.isFinite(v)) || (typeof v === "string" && v.length > 0),
    "set takes a value",
  ],
  swipe: [(v) => v === "left" || v === "right", "swipe takes left or right"],
};

export function validateActionValue(
  action: string,
  value: unknown,
  limits?: { numeric?: true; min?: number; max?: number; integer?: boolean },
): ValueError | null {
  const rule = rules[action];
  if (!rule) return { code: "invalid_value", hint: `unknown action ${action}` };
  if (!rule[0](value)) return { code: "invalid_value", hint: rule[1] };
  if (limits && (limits.numeric || limits.min !== undefined || limits.max !== undefined || limits.integer)) {
    if (typeof value !== "number" || !Number.isFinite(value))
      return { code: "invalid_value", hint: "set takes a finite number" };
    if (limits.integer && !Number.isInteger(value))
      return { code: "invalid_value", hint: "set takes an integer" };
    if (limits.min !== undefined && value < limits.min)
      return { code: "invalid_value", hint: `set takes ${limits.min} or more` };
    if (limits.max !== undefined && value > limits.max)
      return { code: "invalid_value", hint: `set takes ${limits.max} or less` };
  }
  return null;
}

export function selectionOffer(meta: Meta, target: string) {
  if (Object.hasOwn(meta.selections ?? {}, target)) return meta.selections![target];
  const choices = meta.select?.choices;
  if (choices && Object.hasOwn(choices, target))
    return { prop: meta.select!.prop, choices: choices[target]! };
}

/** Undefined means no explicit offer declaration; an empty list means there are no offered choices. */
export function choiceValues(meta: Meta, props: Values, target: string): unknown[] | undefined {
  const source = selectionOffer(meta, target)?.choices;
  if (!source) return undefined;
  const allowed = "prop" in source ? props[source.prop] : source;
  return Array.isArray(allowed) ? allowed.filter((value) => !validateActionValue("select", value)) : [];
}

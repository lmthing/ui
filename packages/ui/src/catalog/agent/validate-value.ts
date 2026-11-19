// Checks the value an action carries, before anything changes. Errors say the allowed format in
// under 10 words (plan 4.12). Part-specific limits (a field's date format) join this with U2 fields.

export type ValueError = { code: "invalid_value"; hint: string };

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

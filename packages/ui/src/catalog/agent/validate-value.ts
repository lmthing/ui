// Checks the value an action carries, before anything changes. Errors say the allowed format in
// under 10 words (plan 4.12). Part-specific limits (a field's date format) join this with U2 fields.

export type ValueError = { code: "invalid_value"; hint: string };

const none = (value: unknown) => value === undefined;

const rules: Record<string, [check: (value: unknown) => boolean, hint: string]> = {
  press: [none, "press takes no value"],
  start: [none, "start takes no value"],
  stop: [none, "stop takes no value"],
  dismiss: [none, "dismiss takes no value"],
  increment: [none, "increment takes no value"],
  decrement: [none, "decrement takes no value"],
  toggle: [(v) => none(v) || typeof v === "boolean", "toggle takes nothing or true/false"],
  check: [(v) => none(v) || typeof v === "boolean", "check takes nothing or true/false"],
  select: [(v) => typeof v === "number" || typeof v === "string", "select takes an index or a label"],
  type: [(v) => typeof v === "string", "type takes text"],
  set: [(v) => typeof v === "number" || typeof v === "string", "set takes a value"],
  swipe: [(v) => v === "left" || v === "right", "swipe takes left or right"],
};

export function validateActionValue(action: string, value: unknown): ValueError | null {
  const rule = rules[action];
  if (!rule) return { code: "invalid_value", hint: `unknown action ${action}` };
  return rule[0](value) ? null : { code: "invalid_value", hint: rule[1] };
}

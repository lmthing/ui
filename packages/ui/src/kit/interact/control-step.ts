import {
  clock,
  isoDate,
  repeatLabels,
  repeatOptions,
  type ActStep,
  type Definition,
  type ScreenLike,
  type Values,
} from "../../catalog";
import { valueKey, type TimerState } from "./live-screen";
type Entry = ScreenLike["components"][number];
export type ControlChange = {
  values: Values;
  value?: unknown;
  error?: string;
  disabled?: boolean;
  send?: { text: string; address: string };
  requestPhoto?: string;
};
const labelOf = (item: Values | undefined) => item?.label ?? item?.title ?? item?.day;
/** A select address identifies its own item; fields additionally accept an index or display label. */
export function selectedStep(step: ActStep, entry: Entry, input: Values, def: Definition): ActStep {
  if (step.action !== "select" || step.value !== undefined) return step;
  const local = step.address.replace(`${entry.id}/`, "");
  const level = local.match(/(?:^|\/)l([1-5])$/);
  if (level) return { ...step, value: Number(level[1]) };
  const match = local.match(/(?:^|\/)r([1-9][0-9]*)$/);
  if (!match) return step;
  const index = Number(match[1]) - 1;
  const items = def.meta.items?.key ? (input[def.meta.items.key] as Values[]) : [];
  return { ...step, value: entry.c === "Calendar" ? items[index]?.day : index };
}
export function controlStep(
  screen: ScreenLike,
  entry: Entry,
  input: Values,
  defs: Record<string, Definition>,
  values: Values,
  step: ActStep,
  now: number,
): ControlChange {
  const next = { ...values },
    get = (part: string) => next[valueKey(screen.id, entry.id, part)],
    put = (part: string, value: unknown) => {
      next[valueKey(screen.id, entry.id, part)] = value;
    };
  const local = step.address.replace(`${screen.id}/`, "");
  const parts = local.split("/");
  const target = parts.slice(1).join("/") || "root";
  const index = /^r[1-9][0-9]*$/.test(parts[1] ?? "") ? Number(parts[1]!.slice(1)) - 1 : -1;
  const def = defs[entry.c]!;
  const bad = (error: string, disabled = false): ControlChange => ({ values, error, disabled });
  let changed: unknown;
  if (step.action === "select" && index >= 0) {
    const key = def.meta.items?.key;
    const item = key ? (input[key] as Values[])[index] : undefined;
    if (!item) return bad("No option at this address");
    const expected = entry.c === "Calendar" ? item.day : index;
    if (step.value !== expected && step.value !== index && step.value !== labelOf(item))
      return bad("Select the option at this address");
    changed = expected;
    if (entry.c === "Calendar") put("$selected", expected);
    else if (["Choice", "Segmented", "TabBar", "Sheet"].includes(entry.c)) {
      put("$at", index);
      if (entry.c === "Sheet") put("at", index);
    } else if (entry.c === "Chips")
      (input.items as Values[]).forEach((_row, at) => put(`r${at + 1}`, at === index));
  }
  if (entry.c === "Field") {
    if (step.action === "press" && input.kind === "photo")
      return { values: next, requestPhoto: valueKey(screen.id, entry.id, "field") };
    if (["type", "set", "select", "toggle"].includes(step.action)) {
      let value = step.value;
      if (step.action === "toggle") value = input.value === "on" ? "off" : "on";
      if (step.action === "select") {
        const choices = input.kind === "repeat" ? [...repeatOptions] : (input.options as string[]);
        if (typeof value === "number") value = choices[value];
        if (input.kind === "repeat")
          value = repeatOptions.find((option) => option === value || repeatLabels[option] === value);
        if (!choices.includes(String(value))) return bad("Choose an available field option");
      }
      const text = value === undefined ? "" : String(value);
      if (input.kind === "date" && text && !isoDate.safeParse(text).success)
        return bad("Use a real date in YYYY-MM-DD");
      if (input.kind === "time" && text && !clock.safeParse(text).success) return bad("Use a time in HH:MM");
      const raw = { ...entry } as Values;
      delete raw.id;
      delete raw.c;
      delete raw.state;
      if (input.kind === "repeat") raw.repeat = value;
      else raw.value = text.trim() ? text : undefined;
      if (!def.props.safeParse(raw).success) return bad("The value does not fit this field");
      put("field", input.kind === "repeat" ? value : text);
      changed = value;
    }
  }
  if (entry.c === "Composer") {
    if (step.action === "type") {
      const text = String(step.value);
      if (text.length > Number(input.max)) return bad("The text is over this composer limit");
      put("field", text);
      changed = text;
    }
    if (step.action === "send") {
      const text = String(get("field") ?? input.value ?? "");
      if (!text.trim()) return bad("Write a reply before sending", true);
      put("field", "");
      return { values: next, send: { text, address: valueKey(screen.id, entry.id, "field") } };
    }
  }
  if (entry.c === "Counter" && ["increment", "decrement"].includes(step.action)) {
    const amount = Number(input.value) + Number(input.step) * (step.action === "increment" ? 1 : -1);
    if (amount < 0 || !Number.isSafeInteger(amount))
      return bad("The counter must stay a safe nonnegative integer", true);
    put("$value", amount);
    put(target, amount);
    changed = amount;
  }
  if (entry.c === "Scale" && step.action === "select") {
    const value = Number(step.value);
    if (
      !Number.isInteger(value) ||
      value < 1 ||
      value > 5 ||
      input.readonly ||
      (/^l[1-5]$/.test(target) && Number(target.slice(1)) !== value)
    )
      return bad("Choose an editable level from one to five");
    put("$value", value);
    changed = value;
  }
  if (entry.c === "Timer" && ["start", "stop"].includes(step.action)) {
    put("$timer", {
      running: step.action === "start",
      from: now,
      seconds: Number(input.seconds),
    } satisfies TimerState);
    put("$seconds", input.seconds);
    changed = step.action === "start" ? "running" : "stopped";
  }
  if (entry.c === "List" && input.style === "expand" && step.action === "toggle") changed = get(target);
  if (entry.c === "SwipeStack" && step.action === "swipe") {
    put("$cursor", Number(get("$cursor") ?? 0) + 1);
    changed = step.value;
  }
  if (step.action === "dismiss" && entry.c !== "Sheet") put("$dismissed", true);
  if (entry.c === "Success" && step.action === "press" && target === "undo") put("$dismissed", true);
  if (def.meta.signature) put("$cue", Number(get("$cue") ?? 0) + 1);
  return { values: next, ...(changed === undefined ? {} : { value: changed }) };
}

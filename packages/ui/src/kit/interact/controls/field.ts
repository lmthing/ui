import { clock, isoDate, wordsFor, repeatOptions, type Values } from "../../../catalog";
import { valueKey, type ControlChange } from "../index";
import type { ControlContext } from "./types";
function fieldValue(ctx: ControlContext) {
  const { step, input } = ctx;
  const words = wordsFor(ctx.lang);
  let value = step.value;
  if (step.action === "toggle") value = input.value === "on" ? "off" : "on";
  if (step.action === "select") {
    const choices = input.kind === "repeat" ? [...repeatOptions] : (input.options as string[]);
    if (typeof value === "number") value = choices[value];
    if (input.kind === "repeat")
      value = repeatOptions.find((option) => option === value || words.repeatLabels[option] === value);
    if (!choices.includes(String(value))) return { error: words.fieldChoiceError };
  }
  return { value };
}
export function fieldControl(ctx: ControlContext): ControlChange {
  const { step, input, entry, values, def, put, bad } = ctx;
  const words = wordsFor(ctx.lang);
  if (step.action === "press" && input.kind === "photo")
    return { values, requestPhoto: valueKey(ctx.screen.id, entry.id, "field") };
  if (!["type", "set", "select", "toggle"].includes(step.action)) return { values };
  const result = fieldValue(ctx);
  if (result.error) return bad(result.error);
  const value = result.value;
  const text = value === undefined ? "" : String(value);
  if (input.kind === "date" && text && !isoDate.safeParse(text).success) return bad(words.fieldDateError);
  if (input.kind === "time" && text && !clock.safeParse(text).success) return bad(words.fieldTimeError);
  const raw = { ...entry } as Values;
  delete raw.id;
  delete raw.c;
  delete raw.state;
  if (input.kind === "repeat") raw.repeat = value;
  else raw.value = text.trim() ? text : undefined;
  if (!def.props.safeParse(raw).success) return bad(words.fieldValueError);
  put("field", input.kind === "repeat" ? value : text);
  return { values, value };
}

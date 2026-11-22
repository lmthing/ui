import { valueKey, type ControlChange } from "../index";
import type { ControlContext } from "./types";
function composerControl(ctx: ControlContext): ControlChange {
  const { step, input, put, get, values, bad } = ctx;
  if (step.action === "type") {
    const text = String(step.value);
    if (text.length > Number(input.max)) return bad("The text is over this composer limit");
    put("field", text);
    put("$sent", undefined);
    return { values, value: text };
  }
  if (step.action === "send") {
    const text = String(get("field") ?? input.value ?? "");
    if (!text.trim()) return bad("Write a reply before sending", true);
    put("field", "");
    put("$sent", true);
    return { values, send: { text, address: valueKey(ctx.screen.id, ctx.entry.id, "field") } };
  }
  return { values };
}
function counterControl(ctx: ControlContext): ControlChange {
  const { step, input, put, values, bad, target } = ctx;
  if (!["increment", "decrement"].includes(step.action)) return { values };
  const amount = Number(input.value) + Number(input.step) * (step.action === "increment" ? 1 : -1);
  if (amount < 0 || !Number.isSafeInteger(amount))
    return bad("The counter must stay a safe nonnegative integer", true);
  put("$value", amount);
  put(target, amount);
  return { values, value: amount };
}
function scaleControl(ctx: ControlContext): ControlChange {
  const { step, input, put, values, bad, target } = ctx;
  if (step.action !== "select") return { values };
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
  return { values, value };
}
export function valueControl(ctx: ControlContext): ControlChange {
  switch (ctx.entry.c) {
    case "Composer":
      return composerControl(ctx);
    case "Counter":
      return counterControl(ctx);
    case "Scale":
      return scaleControl(ctx);
    default:
      return { values: ctx.values };
  }
}

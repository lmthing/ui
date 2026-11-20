import { clip, limitAt, type ActStep, type Values } from "../../../../catalog";
import { controlStep } from "../../index";
import { navigationAction } from "./navigation";
import { deliverSend, rejected, type ActionContext, type ActionResult, type ActionState } from "../index";
function appendMessage(values: Values, message: { text: string }, ctx: ActionContext) {
  const conversation = ctx.active.components.filter((item) => item.c === "Bubbles").at(-1);
  if (!conversation) return;
  const maxText = limitAt(ctx.defs.Bubbles!, ["messages", "*", "text"]) ?? message.text.length;
  const maxMessages = limitAt(ctx.defs.Bubbles!, ["messages"], "maxItems") ?? Number.MAX_SAFE_INTEGER;
  values[ctx.key(conversation.id, "$messages")] = [
    ...(conversation.messages as Values[]),
    { from: "me", text: clip(message.text, maxText) },
  ].slice(-maxMessages);
}
export function controlsAction(state: ActionState, action: ActStep, ctx: ActionContext): ActionResult {
  const control = controlStep(
    ctx.active,
    ctx.entry,
    ctx.input,
    ctx.defs,
    state.values,
    ctx.selected,
    ctx.now(),
    ctx.options.lang,
  );
  if (control.error)
    return rejected(state, ctx.at, control.disabled ? "disabled" : "invalid_value", control.error);
  const values = control.values;
  const changes = [...state.changes];
  const effects: (() => void)[] = [];
  if (action.action === "type") {
    values[`${ctx.screen.id}/${action.address}/$draft`] = undefined;
    values[`${ctx.screen.id}/${action.address}/$error`] = undefined;
  }
  if (control.value !== undefined)
    changes[changes.length - 1] = `${action.address} ${action.action} = ${JSON.stringify(control.value)}`;
  const message = ctx.send ?? control.send;
  if (message) {
    if (control.send) appendMessage(values, message, ctx);
    effects.push(() => deliverSend(message, ctx.options.onSend));
  }
  if (control.requestPhoto && ctx.options.requestPhoto) {
    const target = control.requestPhoto;
    effects.push(() => ctx.requestPhoto(ctx.entry.id, target));
  }
  const navigation = navigationAction({ ...state, values, changes }, action, ctx);
  return { ...navigation, effects: [...effects, ...navigation.effects] };
}

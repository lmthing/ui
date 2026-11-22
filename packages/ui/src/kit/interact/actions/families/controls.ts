import { attachmentKey, clip, limitAt, type ActStep, type SendDraft, type Values } from "../../../../catalog";
import { controlStep } from "../../index";
import { navigationAction } from "./navigation";
import { deliverSend, rejected, type ActionContext, type ActionResult, type ActionState } from "../index";
function appendMessage(values: Values, text: string, attached: boolean, ctx: ActionContext) {
  const conversation = ctx.active.components.filter((item) => item.c === "Bubbles").at(-1);
  if (!conversation) return;
  const maxText = limitAt(ctx.defs.Bubbles!, ["messages", "*", "text"]) ?? text.length;
  const maxMessages = limitAt(ctx.defs.Bubbles!, ["messages"], "maxItems") ?? Number.MAX_SAFE_INTEGER;
  values[ctx.key(conversation.id, "$messages")] = [
    ...(conversation.messages as Values[]),
    { from: "me", text: clip(text, maxText), ...(attached ? { attachment: { kind: "file" } } : {}) },
  ].slice(-maxMessages);
}

function takeComposerAttachment(values: Values, ctx: ActionContext) {
  const slot = ctx.key(ctx.entry.id, attachmentKey("attach"));
  // The mirror changes with the rest of the draft, so dry runs, rejected batches and
  // a second send planned in the same batch cannot consume the host's reference twice.
  if (values[slot] === undefined) return;
  const reference = ctx.attachmentReference(ctx.key(ctx.entry.id, "attach"));
  if (reference !== undefined) {
    values[slot] = undefined;
    return reference;
  }
}

function sendEffect(message: SendDraft, composer: boolean, values: Values, ctx: ActionContext) {
  if (composer) {
    const reference = takeComposerAttachment(values, ctx);
    if (ctx.input.style === "reply") appendMessage(values, message.text, reference !== undefined, ctx);
    return () => deliverSend(message, ctx.options.onSend, reference === undefined ? undefined : [reference]);
  }
  const references = message.attachments?.map(ctx.attachmentReference);
  if (references?.some((reference) => reference === undefined)) return;
  return () =>
    deliverSend(
      message,
      ctx.options.onSend,
      references?.filter((reference) => reference !== undefined),
    );
}

export function controlsAction(state: ActionState, action: ActStep, ctx: ActionContext): ActionResult {
  const control = controlStep(
    ctx.active,
    ctx.entry,
    ctx.input,
    ctx.defs,
    state.values,
    ctx.plannedDate ?? ctx.selected,
    ctx.now(),
    ctx.options.lang,
    Boolean(ctx.plannedDate),
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
    const send = sendEffect(message, Boolean(control.send && ctx.entry.c === "Composer"), values, ctx);
    if (!send) return rejected(state, ctx.at, "not_actionable", "An attachment is unavailable");
    effects.push(send);
  }
  if (control.requestPhoto && ctx.options.requestPhoto) {
    const target = control.requestPhoto;
    effects.push(() => ctx.requestPhoto(ctx.entry.id, target));
  }
  const navigation = navigationAction({ ...state, values, changes }, action, ctx);
  return { ...navigation, effects: [...effects, ...navigation.effects] };
}

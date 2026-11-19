import { affordancesOf, liveProps, stampItemIds, type ActStep } from "../../../catalog";
import { controlsAction, mediaAction, showConfirmation } from "./families";
import type { ActionContext, ActionHandler, ActionState } from "./types";
export function confirmationFor(state: ActionState, action: ActStep, ctx: ActionContext) {
  const meta = ctx.defs[ctx.entry.c]!.meta;
  const target = action.address === ctx.entry.id ? "root" : action.address.slice(ctx.entry.id.length + 1);
  if (
    action.action === "press" &&
    Object.hasOwn(meta.clearItems ?? {}, target) &&
    meta.confirmParts?.includes(target)
  )
    return showConfirmation(state, ctx.selected, ctx);
  const local = Object.fromEntries(
    Object.entries(state.values).map(([address, value]) => [address.replace(`${ctx.screen.id}/`, ""), value]),
  );
  const props = liveProps(meta, stampItemIds(meta, ctx.input), ctx.entry.id, local, true);
  const part = affordancesOf(meta, props, ctx.entry.id, local).find(
    (offered) => offered.address === action.address && offered.action === action.action,
  )?.part;
  return (part && meta.confirmParts?.includes(part)) ||
    (ctx.entry.c === "Button" && action.action === "press" && ctx.input.confirm)
    ? showConfirmation(state, ctx.selected, ctx)
    : undefined;
}
const playbackAction: ActionHandler = (state, action, ctx) =>
  ctx.entry.c === "Player" ? mediaAction(state, action, ctx) : controlsAction(state, action, ctx);
export const actionTable: Readonly<Record<ActStep["action"], ActionHandler>> = {
  press: playbackAction,
  play: playbackAction,
  pause: playbackAction,
  seek: playbackAction,
  select: playbackAction,
  type: playbackAction,
  set: playbackAction,
  toggle: playbackAction,
  check: playbackAction,
  increment: playbackAction,
  decrement: playbackAction,
  start: playbackAction,
  stop: playbackAction,
  send: playbackAction,
  dismiss: playbackAction,
  swipe: playbackAction,
};
export const handlerFor = (action: string): ActionHandler =>
  Object.hasOwn(actionTable, action) ? actionTable[action]! : playbackAction;

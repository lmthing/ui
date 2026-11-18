import type { ActStep } from "../../../catalog";
import { controlsAction, mediaAction, showConfirmation } from "./families";
import type { ActionHandler } from "./types";
const pressAction: ActionHandler = (state, action, ctx) =>
  ctx.entry.c === "Button" && ctx.input.confirm
    ? showConfirmation(state, action, ctx)
    : ctx.entry.c === "Player"
      ? mediaAction(state, action, ctx)
      : controlsAction(state, action, ctx);
const playbackAction: ActionHandler = (state, action, ctx) =>
  ctx.entry.c === "Player" ? mediaAction(state, action, ctx) : controlsAction(state, action, ctx);
export const actionTable: Readonly<Record<ActStep["action"], ActionHandler>> = {
  press: pressAction,
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

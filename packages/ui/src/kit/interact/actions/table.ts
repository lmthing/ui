import {
  affordancesOf,
  isRecordPress,
  itemEditSpec,
  isRecordAction,
  liveProps,
  parseControlProps,
  projectDeviceData,
  recordClaimAt,
  reportConfirmation,
  reportRemovalAt,
  stampItemIds,
  recordTargetAt,
  type ActStep,
  type StateName,
} from "../../../catalog";
import { controlsAction, mediaAction, showConfirmation } from "./families";
import { rejected, type ActionContext, type ActionHandler, type ActionState } from "./types";

function confirmReportAction(state: ActionState, ctx: ActionContext, target: string) {
  const { id, c, state: _state, ...wire } = ctx.entry;
  const def = ctx.defs[c]!;
  if (isRecordAction(def.meta, target, ctx.selected.action)) {
    const prefix = `${ctx.screen.id}/`;
    const local = Object.fromEntries(
      Object.entries(state.values)
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, value]) => [key.slice(prefix.length), value]),
    );
    const parsed = parseControlProps(def, wire, (part) => local[`${id}/${part}`]);
    const data = projectDeviceData(ctx.options.deviceData, state.values);
    const claim = recordClaimAt(
      def.meta,
      liveProps(def.meta, parsed, id, local, true, data),
      target,
      ctx.selected.action,
    );
    return claim
      ? showConfirmation(state, ctx.selected, ctx, { record: claim })
      : rejected(state, ctx.at, "not_actionable", "No record at this address");
  }
  if (itemEditSpec(def.meta, target)?.action !== "remove") return showConfirmation(state, ctx.selected, ctx);
  const props = parseControlProps(def, wire, (part) => state.values[ctx.key(id, part)]);
  const removal = reportRemovalAt(def.meta, props, target);
  return removal
    ? showConfirmation(state, ctx.selected, ctx, removal)
    : rejected(state, ctx.at, "not_actionable", "No photo at this address");
}

function confirmRecordAction(state: ActionState, action: ActStep, ctx: ActionContext) {
  const { id, c, state: _state, ...wire } = ctx.entry;
  const def = ctx.defs[c]!;
  const prefix = `${ctx.screen.id}/`;
  const local = Object.fromEntries(
    Object.entries(state.values).map(([key, value]) => [
      key.startsWith(prefix) ? key.slice(prefix.length) : key,
      value,
    ]),
  );
  const parsed = parseControlProps(def, wire, (part) => local[`${id}/${part}`]);
  const data = projectDeviceData(ctx.options.deviceData, state.values);
  const props = liveProps(def.meta, parsed, id, local, true, data, ctx.now());
  const recordTarget = recordTargetAt(def.meta, props, action.address, action.action);
  return recordTarget === undefined
    ? rejected(state, ctx.at, "not_actionable", "No record at this address")
    : showConfirmation(state, { ...ctx.selected, recordTarget }, ctx);
}

export function confirmationFor(state: ActionState, action: ActStep, ctx: ActionContext) {
  const meta = ctx.defs[ctx.entry.c]!.meta;
  const target = action.address === ctx.entry.id ? "root" : action.address.slice(ctx.entry.id.length + 1);
  if (reportConfirmation(meta, target, action.action))
    return isRecordPress(meta, action.address, action.action)
      ? confirmRecordAction(state, action, ctx)
      : confirmReportAction(state, ctx, target);
  if (
    action.action === "press" &&
    Object.hasOwn(meta.clearItems ?? {}, target) &&
    meta.confirmParts?.includes(target)
  )
    return showConfirmation(state, ctx.selected, ctx);
  const local = Object.fromEntries(
    Object.entries(state.values).map(([address, value]) => [address.replace(`${ctx.screen.id}/`, ""), value]),
  );
  const props = liveProps(
    meta,
    stampItemIds(meta, ctx.input),
    ctx.entry.id,
    local,
    true,
    projectDeviceData(ctx.options.deviceData, state.values),
  );
  const part = affordancesOf(
    meta,
    props,
    ctx.entry.id,
    local,
    (props.state as StateName | undefined) ?? ctx.entry.state,
  ).find((offered) => offered.address === action.address && offered.action === action.action)?.part;
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

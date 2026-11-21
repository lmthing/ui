import {
  atDeviceTime,
  affordancesOf,
  driveAffordances,
  driveTarget,
  hostOnlyAddresses,
  liveProps,
  parseControlProps,
  privateMarkKey,
  projectDeviceData,
  projectSelectionBinding,
  recordClockOffer,
  reportEditWire,
  selectionBindingFor,
  withDisabledSelectionChecks,
  withRecordScreen,
  type StateName,
} from "../../../../catalog";
import type { ControllerContext } from "../index";
import { drivenPartBlock } from "./introduced-part";

export function actionsAt(
  ctx: ControllerContext,
  address: string,
  includeBlocked = false,
  ignoreDisabledPart = false,
): string[] {
  const local = ctx.relative(address),
    id = local.split("/")[0]!;
  if (ctx.status.disposed || (!ignoreDisabledPart && ctx.disabledParts.has(local))) return [];
  if (ctx.privateMarks.has(local) || ctx.store.get(privateMarkKey(ctx.screen.id, local))) return [];
  if (ctx.confirmationFor()) {
    if (local === "confirm/confirm") return ["press"];
    return ["confirm/cancel", "confirm/close"].includes(local) ? ["dismiss"] : [];
  }
  const now = ctx.now();
  const values = ctx.valuesOf(now);
  const sheet = ctx.status.openSheet;
  const visible = ctx.liveScreen(values, sheet, Boolean(sheet), now);
  const screen = withDisabledSelectionChecks(visible, ctx.disabledParts);
  const entry = screen.components.find((item) => item.id === id);
  const def = entry && ctx.defs[entry.c];
  if (!entry || !def) return [];
  const { draw, emptyActions, errorActions, session, successActions } = def.meta;
  const stateActions =
    draw || emptyActions?.length || errorActions?.length || session || successActions?.length;
  if (entry.state && entry.state !== "filled" && !stateActions) return [];
  try {
    const localValues = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key.replace(`${ctx.screen.id}/`, ""), value]),
    );
    const { id: _id, c: _c, state: _state, ...raw } = entry;
    const get = (part: string) => localValues[`${id}/${part}`];
    const projected = projectDeviceData(ctx.options.deviceData, values);
    const data = withRecordScreen(atDeviceTime(projected, now), ctx.screen);
    const live = liveProps(def.meta, parseControlProps(def, raw, get), id, localValues, true, data);
    const selection = selectionBindingFor(screen, ctx.defs, def.meta, id, localValues, data);
    const props = projectSelectionBinding(def.meta, live, selection?.view);
    const clock = recordClockOffer(def, raw, props, get, data, now, values);
    const wire = reportEditWire(def, raw, get);
    const state = (props.state as StateName | undefined) ?? entry.state;
    const offerContext = { data, clock, wire, schema: def.props };
    const offered = affordancesOf(def.meta, props, id, localValues, state, includeBlocked, offerContext);
    if (hostOnlyAddresses(def, id, offered)?.has(local)) return [];
    const canDrive = (part: string) => !drivenPartBlock(ctx, part);
    const target = driveTarget(def.meta, screen, ctx.defs, localValues, data, canDrive);
    return driveAffordances(def.meta, props, id, offered, target)
      .filter((item) => item.address === local)
      .map((item) => item.action);
  } catch {
    return [];
  }
}

import {
  atDeviceTime,
  affordancesOf,
  declaresNumericLimits,
  driveAffordances,
  driveTarget,
  hostOnlyAddresses,
  hostActionPolicy,
  isLocalAnchorAction,
  liveProps,
  parseControlProps,
  partTierAt,
  privateMarkKey,
  projectDeviceData,
  projectDriveObservation,
  projectSelectionBinding,
  recordClockOffer,
  reportEditWire,
  selectionBindingFor,
  withDisabledSelectionChecks,
  withRecordScreen,
  type Affordance,
  type Meta,
  type StateName,
  type Values,
} from "../../../../catalog";
import type { ControllerContext } from "../context";
import { driveAccess, inactive } from "../planning";

function confirmationOffer(local: string): Affordance[] {
  if (local === "confirm/confirm") return [{ address: local, part: "confirm", action: "press", detail: "" }];
  return ["confirm/cancel", "confirm/close"].includes(local)
    ? [{ address: local, part: local.split("/")[1]!, action: "dismiss", detail: "" }]
    : [];
}

function captureStart({ action, hostIntent, part }: Affordance, meta: Meta, props: Values) {
  return (
    action === "start" &&
    !hostIntent &&
    partTierAt(meta, props, part) === "ok" &&
    !meta.confirmParts?.includes(part)
  );
}

export function offersAt(
  ctx: ControllerContext,
  address: string,
  includeBlocked = false,
  ignoreDisabledPart = false,
  captureOnly = false,
): Affordance[] {
  const local = ctx.relative(address),
    id = local.split("/")[0]!;
  if (ctx.status.disposed || (!ignoreDisabledPart && ctx.disabledParts.has(local))) return [];
  if (ctx.privateMarks.has(local) || ctx.store.get(privateMarkKey(ctx.screen.id, local))) return [];
  if (ctx.confirmationFor()) return captureOnly ? [] : confirmationOffer(local);
  const now = ctx.now();
  const values = ctx.valuesOf(now);
  const sheet = ctx.status.openSheet;
  const visible = ctx.liveScreen(values, sheet, Boolean(sheet), now);
  const screen = withDisabledSelectionChecks(visible, ctx.disabledParts);
  const entry = screen.components.find((item) => item.id === id);
  const def = entry && ctx.defs[entry.c];
  if (!entry || !def || inactive(ctx, entry)) return [];
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
    const canDrive = driveAccess(ctx);
    const target = driveTarget(def.meta, screen, ctx.defs, localValues, data, canDrive);
    const props = projectDriveObservation(
      def.meta,
      projectSelectionBinding(def.meta, live, selection?.view),
      id,
      target,
    );
    const clock = recordClockOffer(def, raw, props, get, data, now, values);
    const wire = reportEditWire(def, raw, get);
    const state = (props.state as StateName | undefined) ?? entry.state;
    const policy = screen[hostActionPolicy];
    const host =
      ignoreDisabledPart && policy?.isDisabled
        ? { ...policy, isDisabled: (at: string) => at !== local && policy.isDisabled!(at) }
        : policy;
    const offerContext = { data, clock, wire, schema: def.props, host, baselineInput: raw, now };
    const offered = affordancesOf(def.meta, props, id, localValues, state, includeBlocked, offerContext);
    if (hostOnlyAddresses(def, id, offered)?.has(local)) return [];
    return driveAffordances(def.meta, props, id, offered, target).filter(
      (item) =>
        item.address === local &&
        (item.action !== "copy" || ctx.clipboard.available()) &&
        (!isLocalAnchorAction(item.action) || canDrive(local, undefined, item.action)) &&
        (!captureOnly || captureStart(item, def.meta, props)),
    );
  } catch {
    return [];
  }
}

/** Null is a declared numeric control without an admitted edit; undefined is legacy. */
export function numericControlAt(ctx: ControllerContext, address: string) {
  const [id, ...parts] = ctx.relative(address).split("/");
  const entry = ctx.sourceOf(id!);
  const meta = entry && ctx.defs[entry.c]?.meta;
  if (!meta) return;
  const part = parts.at(-1) ?? "root";
  if (
    !declaresNumericLimits(meta, part, parts.length > 1) &&
    !(parts.length === 1 && declaresNumericLimits(meta, "root", true))
  )
    return;
  const numeric = offersAt(ctx, address).find((offer) => offer.action === "set")?.numeric;
  if (!numeric?.spec.declared) return null;
  const { min, max, step, integer } = numeric.spec;
  return {
    ...(Number.isFinite(min) ? { min } : {}),
    ...(Number.isFinite(max) ? { max } : {}),
    ...(step !== undefined || integer ? { step: step ?? 1 } : {}),
    value: typeof numeric.value === "number" ? numeric.value : undefined,
  };
}

export function actionsAt(
  ctx: ControllerContext,
  address: string,
  includeBlocked = false,
  ignoreDisabledPart = false,
) {
  return offersAt(ctx, address, includeBlocked, ignoreDisabledPart).map(({ action }) => action);
}
export function offersReveal(ctx: ControllerContext, address: string, ignoreDisabledPart = false) {
  return offersAt(ctx, address, false, ignoreDisabledPart).some(({ hostReveal }) => hostReveal === true);
}

export function offersMicCapture(ctx: ControllerContext, address: string, ignoreDisabledPart: boolean) {
  return offersAt(ctx, address, false, ignoreDisabledPart, true).length > 0;
}

import {
  atDeviceTime,
  declaresNumericLimits,
  driveAffordances,
  hostOnlyAddresses,
  hostActionPolicy,
  isLocalAnchorAction,
  partTierAt,
  privateMarkKey,
  projectDeviceData,
  withDisabledSelectionChecks,
  withRecordScreen,
  type Affordance,
  type Meta,
  type Values,
} from "../../../../catalog";
import { componentOffers, localValues } from "../../../../catalog/agent/action-input";
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
    const localInput = localValues(ctx.screen.id, values);
    const projected = projectDeviceData(ctx.options.deviceData, values);
    const data = withRecordScreen(atDeviceTime(projected, now), ctx.screen);
    const canDrive = driveAccess(ctx);
    const policy = screen[hostActionPolicy];
    const host =
      ignoreDisabledPart && policy?.isDisabled
        ? { ...policy, isDisabled: (at: string) => at !== local && policy.isDisabled!(at) }
        : policy;
    const { props, target, offered } = componentOffers(screen, ctx.defs, entry, values, localInput, {
      data,
      now,
      host,
      includeBlocked,
      canDrive,
    });
    if (hostOnlyAddresses(def, id, offered)?.has(local)) return [];
    return driveAffordances(def.meta, props, id, offered, target).filter(
      (item) =>
        item.address === local &&
        (item.action !== "copy" || item.hostSecret === "copy" || ctx.clipboard.available()) &&
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

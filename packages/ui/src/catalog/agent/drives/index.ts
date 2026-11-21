import type { Meta } from "../../meta";
import type { Definition } from "../../probes";
import {
  validateActionValue,
  type ActStep,
  type Affordance,
  type DeviceData,
  type ScreenLike,
  type Values,
} from "../index";
import { addressedItems } from "../visibility";
import { driveSeekPart } from "./declaration";
import { observePlayback, routeBinding } from "./bindings";
import { resolveTarget, type CanDrive, type DriveContext } from "./target";
export { checkDriveDeclaration } from "./declaration";
export type { CanDrive } from "./target";

type DriveTarget = { address: string; screen: string; seconds: unknown };
type DriveResolution = DriveTarget | DriveContext;
export const isLocalAnchorAction = (action: string): action is "focus" | "jump" =>
  action === "focus" || action === "jump";

/** Legacy chapter drives keep the first matching seek in screen order. Typed drives resolve per part. */
export function driveTarget(
  meta: Meta,
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  data?: DeviceData,
  canDrive?: CanDrive,
  privateAddresses?: ReadonlySet<string>,
): DriveResolution | undefined {
  if (meta.drives === undefined) return;
  const context = { screen, defs, values, data, canDrive, privateAddresses };
  if (typeof meta.drives !== "string") return context;
  if (meta.drives === meta.id || !Object.hasOwn(defs, meta.drives)) return;
  const def = defs[meta.drives];
  const part = def && driveSeekPart(def.meta);
  if (!part) return;
  for (const entry of screen.components) {
    if (entry.c !== meta.drives) continue;
    const target = resolveTarget(context, entry, part, "seek", "legacy");
    if (target)
      return canDrive?.(target.address) === false
        ? undefined
        : { address: target.address, screen: screen.id, seconds: target.props.seconds };
  }
}

export function projectDriveObservation(meta: Meta, props: Values, id: string, resolved?: DriveResolution) {
  const observation = typeof meta.drives === "object" && meta.drives.observe;
  return observation && resolved && "defs" in resolved
    ? observePlayback(resolved, observation, id, props)
    : props;
}

/** Keep the source address; attach the validated destination step instead of a link. */
export function driveAffordances(
  meta: Meta,
  props: Values,
  id: string,
  offered: Affordance[],
  target?: DriveResolution,
): (Affordance & { drive?: ActStep })[] {
  if (meta.drives === undefined) return offered;
  if (typeof meta.drives === "object") {
    const { drives } = meta;
    return offered.flatMap((offer) => {
      if (target && "defs" in target) {
        const routed = routeBinding(target, meta, drives, props, id, offer);
        return routed ? [routed] : [];
      }
      const isItem = offer.address !== (offer.part === "root" ? id : `${id}/${offer.part}`);
      return offer.action === "press" &&
        drives.commands?.some(({ scope, part }) => part === offer.part && (scope === "item") === isItem)
        ? []
        : [offer];
    });
  }
  const legacy = target && "address" in target ? target : undefined;
  const rows = new Map(addressedItems(meta, props).map((row) => [`${id}/${String(row.id)}`, row]));
  return offered.flatMap((a) => {
    const row = a.action === "press" && a.part === "root" && rows.get(a.address);
    if (!row) return [a];
    const value = row.at;
    if (!legacy || typeof value !== "number" || validateActionValue("seek", value)) return [];
    if (typeof legacy.seconds === "number" && value > legacy.seconds) return [];
    const readAddress = id === legacy.screen ? `${legacy.screen}/${a.address}` : a.address;
    return [{ ...a, readAddress, detail: "", drive: { address: legacy.address, action: "seek", value } }];
  });
}

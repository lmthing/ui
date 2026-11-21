import type { Meta } from "../../meta";
import type { Definition } from "../../probes";
import type { StateName } from "../../types";
import {
  affordancesOf,
  hostActionPolicy,
  isDeviceDataVisible,
  liveProps,
  parseControlProps,
  projectSelectionBinding,
  selectionBindingFor,
  validateActionValue,
  type ActStep,
  type Affordance,
  type DeviceData,
  type ScreenLike,
  type Values,
} from "../index";
import { hostOnlyAddresses, isPrivateMark } from "../action-input";
import { addressedItems } from "../visibility";
import { driveSeekPart } from "./declaration";
export { checkDriveDeclaration } from "./declaration";

type DriveTarget = { address: string; screen: string; seconds: unknown };
export type CanDrive = (address: string) => boolean;

/** The first same-screen instance offering its declared seek, in screen order. */
export function driveTarget(
  meta: Meta,
  screen: ScreenLike,
  defs: Record<string, Definition>,
  values: Values,
  data?: DeviceData,
  canDrive?: CanDrive,
  privateAddresses?: ReadonlySet<string>,
): DriveTarget | undefined {
  if (meta.drives === undefined || meta.drives === meta.id || !Object.hasOwn(defs, meta.drives)) return;
  const def = defs[meta.drives];
  if (!def || def.meta.id !== meta.drives || !isDeviceDataVisible(def.meta, data)) return;
  const part = driveSeekPart(def.meta);
  if (!part) return;
  for (const { id, c, state, ...input } of screen.components) {
    if (c !== meta.drives || values[`${id}/$dismissed`]) continue;
    const address = part === "root" ? id : `${id}/${part}`;
    if (privateAddresses?.has(address) || isPrivateMark(values, address)) continue;
    const live = liveProps(
      def.meta,
      parseControlProps(def, input, (key) => values[`${id}/${key}`]),
      id,
      values,
      true,
      data,
    );
    const selection = selectionBindingFor(screen, defs, def.meta, id, values, data, privateAddresses);
    const props = projectSelectionBinding(def.meta, live, selection?.view);
    const offered = affordancesOf(def.meta, props, id, values, (props.state as StateName) ?? state, false, {
      data,
      host: screen[hostActionPolicy],
    });
    if (hostOnlyAddresses(def, id, offered)?.has(address)) continue;
    if (offered.some((a) => a.address === address && a.action === "seek" && !a.hostIntent))
      return !canDrive || canDrive(address)
        ? { address, screen: screen.id, seconds: props.seconds }
        : undefined;
  }
}

/** Keep the source address; attach the validated destination step instead of a link. */
export function driveAffordances(
  meta: Meta,
  props: Values,
  id: string,
  offered: Affordance[],
  target?: DriveTarget,
): (Affordance & { drive?: ActStep })[] {
  if (meta.drives === undefined) return offered;
  const rows = new Map(addressedItems(meta, props).map((row) => [`${id}/${String(row.id)}`, row]));
  return offered.flatMap((a) => {
    if (a.hostIntent || a.hostReveal) return [a];
    const row = a.action === "press" && a.part === "root" && rows.get(a.address);
    if (!row) return [a];
    const value = row.at;
    if (!target || typeof value !== "number" || validateActionValue("seek", value)) return [];
    if (typeof target.seconds === "number" && value > target.seconds) return [];
    const readAddress = id === target.screen ? `${target.screen}/${a.address}` : a.address;
    return [{ ...a, readAddress, detail: "", drive: { address: target.address, action: "seek", value } }];
  });
}

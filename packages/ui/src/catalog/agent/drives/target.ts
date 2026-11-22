import type { SiblingPart } from "../../meta";
import type { Definition } from "../../probes";
import { hostOnlyAddresses, isPrivateMark } from "../private-controls";
import { recordClockOffer } from "../clocks";
import {
  affordancesOf,
  hostActionPolicy,
  isDeviceDataVisible,
  liveProps,
  parseControlProps,
  partTierAt,
  projectSelectionBinding,
  reportEditWire,
  selectionBindingFor,
  type DeviceData,
  type ScreenLike,
  type Values,
} from "../index";

export type CanDrive = (address: string, observe?: true, action?: string) => boolean;
export type DriveContext = {
  screen: ScreenLike;
  defs: Record<string, Definition>;
  values: Values;
  data: DeviceData | undefined;
  canDrive: CanDrive | undefined;
  privateAddresses: ReadonlySet<string> | undefined;
};

export function siblingEntries(
  ctx: DriveContext,
  to: SiblingPart | { self: true; part: string },
  source: string,
  props: Values,
) {
  if ("self" in to) return ctx.screen.components.filter(({ id }) => id === source);
  const instance = typeof to.instance === "object" ? props[to.instance.prop] : to.instance;
  if (to.instance !== undefined && (typeof instance !== "string" || !instance)) return [];
  return ctx.screen.components.filter(
    ({ id, c }) => c === to.component && id !== source && (instance === undefined || id === instance),
  );
}

export function resolveTarget(
  ctx: DriveContext,
  entry: ScreenLike["components"][number],
  part: string,
  action: string,
  mode: "legacy" | "command" | "observe",
) {
  const { screen, defs, values, data, privateAddresses } = ctx;
  const { id, c, state, ...input } = entry;
  const def = Object.hasOwn(defs, c) ? defs[c] : undefined;
  if (!def || def.meta.id !== c || values[`${id}/$dismissed`] || !isDeviceDataVisible(def.meta, data)) return;
  const { meta } = def;
  const address = part === "root" ? id : `${id}/${part}`;
  if (privateAddresses?.has(address) || isPrivateMark(values, address)) return;
  const get = (key: string) => values[`${id}/${key}`];
  const live = liveProps(meta, parseControlProps(def, input, get), id, values, true, data);
  const selection = selectionBindingFor(screen, defs, meta, id, values, data, privateAddresses);
  if (meta.selectionBinding?.requireSelection && !selection?.view.selected.length) return;
  const props = projectSelectionBinding(meta, live, selection?.view);
  const shown = (props.state as typeof state) ?? state ?? "filled";
  if (
    mode !== "legacy" &&
    (partTierAt(meta, props, part) !== "phone" ||
      !meta.parts?.includes(part) ||
      !meta.actions?.parts?.[part]?.some((name) => name === action))
  )
    return;
  const offered = affordancesOf(meta, props, id, values, shown, false, {
    data,
    clock: recordClockOffer(def, input, props, get, data, undefined, values),
    wire: reportEditWire(def, input, get),
    schema: def.props,
    host: screen[hostActionPolicy],
    baselineInput: input,
  });
  const offer = offered.find(
    (a) => a.address === address && a.action === action && !a.hostIntent && !a.hostReveal && !a.hostSecret,
  );
  if (hostOnlyAddresses(def, id, [{ address, part, action, detail: "" }])?.has(address)) return;
  if (mode === "observe" ? shown !== "filled" : !offer) return;
  return { address, props, meta, offer, get };
}

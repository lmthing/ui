import type { Meta } from "../../meta";
import type { Definition } from "../../probes";
import type { StateName } from "../../types";
import {
  affordancesOf,
  isDeviceDataVisible,
  liveProps,
  parseControlProps,
  type Affordance,
  type DeviceData,
  type ScreenLike,
  type Values,
} from "../index";
import { hostOnlyAddresses, isPrivateMark } from "../private-controls";
import { hostActionPolicy } from "../host-commands";

export type BoundSelection = Readonly<{
  source: string;
  selected: readonly string[];
  canSelectAll: boolean;
}>;

/** Host-only eligibility, carried through screen projections but never serialized. */
export const disabledSelectionChecks = Symbol("disabledSelectionChecks");
type DisabledChecks = Pick<ReadonlySet<string>, "size" | "has">;
export function withDisabledSelectionChecks(screen: ScreenLike, disabled?: DisabledChecks): ScreenLike {
  return disabled?.size ? { ...screen, [disabledSelectionChecks]: disabled } : screen;
}

/** Resolve against the source's regular row check offers, including its live values and eligibility. */
export function selectionBindingFor(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  meta: Meta,
  instance: string,
  local: Values,
  data?: DeviceData,
  privateAddresses?: ReadonlySet<string>,
) {
  const binding = meta.selectionBinding;
  if (!binding) return;
  const sources = screen.components.filter(
    ({ id, c }) =>
      id !== instance &&
      c === binding.component &&
      (binding.source === undefined || id === binding.source) &&
      !local[`${id}/$dismissed`] &&
      defs[c] &&
      isDeviceDataVisible(defs[c].meta, data),
  );
  if (sources.length !== 1) return;
  const { id, c, state, ...wire } = sources[0]!;
  const def = defs[c]!;
  if (!def.meta.items || !def.meta.actions?.items?.[binding.check]?.includes("check")) return;
  const get = (part: string) => local[`${id}/${part}`];
  const props = liveProps(def.meta, parseControlProps(def, wire, get), id, local, true, data);
  const length = binding.check === "root" ? 2 : 3;
  const offered = affordancesOf(
    def.meta,
    props,
    id,
    local,
    (props.state as StateName | undefined) ?? state,
    false,
    { data, host: screen[hostActionPolicy] },
  );
  const hostOnly = hostOnlyAddresses(def, id, offered);
  const checks = offered.filter(
    ({ address, action, part, hostIntent }) =>
      action === "check" &&
      !hostIntent &&
      part === binding.check &&
      address.split("/").length === length &&
      !screen[disabledSelectionChecks]?.has(address) &&
      !hostOnly?.has(address) &&
      !privateAddresses?.has(address) &&
      !isPrivateMark(local, address),
  );
  if (!checks.length) return;
  const selected = checks
    .filter(({ address, detail, input }) =>
      input ? detail === ":done" : (local[address] ?? detail === ":done") === true,
    )
    .map(({ address }) => address.split("/")[1]!);
  const view: BoundSelection = { source: id, selected, canSelectAll: selected.length < checks.length };
  return { view, checks };
}

/** This projection is for drawing and reading only; it is never written into the wire schema. */
export function projectSelectionBinding(meta: Meta, props: Values, selection?: BoundSelection): Values {
  return meta.selectionBinding ? { ...props, $selection: selection } : props;
}

export function boundActionAvailable(meta: Meta, props: Values, part: string, action: string, item: boolean) {
  if (!meta.selectionBinding) return true;
  const selection = props.$selection as BoundSelection | undefined;
  if (!selection || (meta.selectionBinding.requireSelection && !selection.selected.length)) return false;
  return isSelectAll(meta, part, action, item) ? selection.canSelectAll : selection.selected.length > 0;
}

export function isSelectAll(meta: Meta, part: string, action: string, item = false): boolean {
  return !item && action === "press" && meta.selectionBinding?.all === part;
}

export function isItemOffer(instance: string, { address, part }: Affordance): boolean {
  return address !== (part === "root" ? instance : `${instance}/${part}`);
}

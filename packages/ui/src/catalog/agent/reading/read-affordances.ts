import type { Meta } from "../../meta";
import type { Definition } from "../../probes";
import type { StateName } from "../../types";
import { hostOnlyAddresses } from "../action-input";
import { driveAffordances, type driveTarget } from "../drives";
import { liveInputKey, pickerAt } from "../live-inputs";
import { linkedInput } from "../linked-edits";
import {
  affordancesOf,
  choiceOptions,
  controlValueKey,
  partTierAt,
  resolveChoice,
  selectionAt,
  selectionOffer,
  sessionActionProps,
  type Affordance,
  type DeviceData,
  type SessionState,
  type Values,
} from "../index";
import { isRuntimeSet, recordClockOffer, setAt } from "../clocks";
import { itemEditAt, reportEditWire } from "../report-edits";
import type { HostActionPolicy } from "../host-commands";

const risks: Record<string, string> = {
  ok: " !needs-ok",
  people: " !needs-people",
  service: " !needs-service",
};

function runtimeRowValue(meta: Meta, props: Values, target: string, fallback: unknown) {
  const flag = meta.select?.runtime && meta.select.prop;
  const option = flag && selectionAt(meta, props, target);
  if (!flag || !option || !option.row) return fallback;
  return option.row[flag] === true ? option.value : undefined;
}

export function readOffers(
  def: Definition,
  wire: unknown,
  instance: string,
  props: Values,
  state: StateName,
  values: Values,
  {
    addresses,
    deviceData: data,
    target,
    host,
  }: {
    addresses: ReadonlySet<string>;
    deviceData?: DeviceData | undefined;
    target?: ReturnType<typeof driveTarget>;
    host?: HostActionPolicy | undefined;
  },
) {
  const get = (part: string) => values[`${instance}/${part}`];
  const offered = affordancesOf(def.meta, props, instance, values, state, false, {
    data,
    clock: recordClockOffer(def, wire as Values, props, get, data, undefined, values),
    wire: reportEditWire(def, wire, get),
    schema: def.props,
    host,
  });
  const hostOnly = hostOnlyAddresses(def, instance, offered);
  const visible = offered.filter(({ address }) => !hostOnly?.has(address) && !addresses.has(address));
  const destination = target && !addresses.has(target.address) ? target : undefined;
  return driveAffordances(def.meta, props, instance, visible, destination);
}

/** Describe the offered controls using live values and choices. */
export function readAffordances(
  affordances: Affordance[],
  values: Values,
  def: Definition,
  props: Values,
  instance: string,
  session?: SessionState,
) {
  const { meta } = def;
  props = sessionActionProps(meta, props, session);
  const answers = session?.kind === "rounds" ? session.assessment?.answers : undefined;
  return affordances.map((a) => {
    const target = a.address === instance ? "root" : a.address.slice(instance.length + 1);
    const options = a.action === "select" && choiceOptions(meta, props, target);
    const item = itemEditAt(meta, props, target);
    const picker = pickerAt(meta, props, target);
    const selected = options
      ? picker
        ? picker.row[picker.spec.prop]
        : item?.spec.action === "select"
          ? item.row[item.spec.prop]
          : props[selectionOffer(meta, target)!.prop]
      : undefined;
    // Advertise a label only when copying it back selects this option.
    const choices =
      options &&
      options.map(({ label, value }) => ({
        value,
        offered:
          label !== undefined && resolveChoice(options, label, !!picker)?.value === value ? label : value,
      }));
    const set = a.action === "set" && setAt(meta, props, target);
    const linked = a.action === "type" && linkedInput(meta, target);
    const value =
      a.action === "type" && item?.spec.action === "type"
        ? item.row[item.spec.prop]
        : linked
          ? props[linked.prop]
          : choices
            ? (choices.find(({ value }) => value === selected)?.offered ?? selected)
            : set
              ? isRuntimeSet(set.spec) || values[`${instance}/${controlValueKey(def, set.key)}`] !== undefined
                ? set.value
                : undefined
              : a.input?.kind === "text"
                ? (answers?.[target] ?? values[`${instance}/${liveInputKey(target, "type")}`])
                : (values[`${a.address}/$draft`] ?? answers?.[target] ?? values[a.address]);
    let detail = a.detail;
    if (typeof value === "boolean" && a.action === "toggle") detail = `:${value ? "on" : "off"}`;
    if (!a.input && typeof value === "boolean" && a.action === "check")
      detail = `:${value ? "done" : "todo"}`;
    const offered = a.action === "select" && !choices ? runtimeRowValue(meta, props, target, value) : value;
    if (offered !== undefined && ["type", "set", "select"].includes(a.action))
      detail = ` = ${JSON.stringify(offered)}`;
    if (choices)
      detail += `${detail ? ";" : ""} choices ${JSON.stringify(choices.map(({ offered }) => offered))}`;
    if (a.move) detail = ` = ${JSON.stringify(a.move.current)}; choices ${JSON.stringify(a.move.choices)}`;
    return { ...a, detail: `${detail}${risks[partTierAt(meta, props, a.part)] ?? ""}` };
  });
}

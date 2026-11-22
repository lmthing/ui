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
import { credentialToggleOn } from "../credential-toggle";
import type { HostActionPolicy } from "../host-commands";
import type { ChoiceOption } from "../validate-value";

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

function booleanDetail(a: Affordance, value: unknown) {
  if (typeof value !== "boolean") return a.detail;
  if (a.input?.kind !== "boolean" && a.action === "toggle") return `:${value ? "on" : "off"}`;
  if (!a.input && a.action === "check") return `:${value ? "done" : "todo"}`;
  return a.detail;
}

/** Advertise a label only when copying it back selects this option. */
function readChoices(options: ChoiceOption[], preferLabel: boolean) {
  return options.map(({ label, value }) => ({
    value,
    offered:
      label !== undefined && resolveChoice(options, label, preferLabel)?.value === value ? label : value,
  }));
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
    baselineInput: wire,
  });
  const hostOnly = hostOnlyAddresses(def, instance, offered);
  const visible = offered.filter(({ address }) => !hostOnly?.has(address) && !addresses.has(address));
  const destination =
    target && (!("address" in target) || !addresses.has(target.address)) ? target : undefined;
  return driveAffordances(def.meta, props, instance, visible, destination);
}

function credentialDetail(meta: Meta, props: Values, offer: Affordance, target: string, value: unknown) {
  if (offer.action !== "toggle") return undefined;
  const fields = meta.actions?.credentialToggles;
  const credential = fields && Object.hasOwn(fields, target) ? fields[target] : undefined;
  if (credential) return credentialToggleOn(value, props[credential]) ? ":on" : ":off";
  return undefined;
}

/** Describe the offered controls using live values and choices. */
function offeredChoices(meta: Meta, props: Values, target: string) {
  const options = choiceOptions(meta, props, target);
  if (!options) return;
  const item = itemEditAt(meta, props, target);
  const picker = pickerAt(meta, props, target);
  const selected = picker
    ? picker.row[picker.spec.prop]
    : item?.spec.action === "select"
      ? item.row[item.spec.prop]
      : props[selectionOffer(meta, target)!.prop];
  // Advertise a label only when copying it back selects this option.
  const choices = readChoices(options, !!picker);
  return { choices, selected: choices.find(({ value }) => value === selected)?.offered ?? selected };
}

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
    if (a.hostReveal) return { ...a, detail: risks.ok! };
    if (a.dateSpan) return { ...a, detail: risks[partTierAt(meta, props, a.part)] ?? "" };
    if (a.rowSelection || a.flagKey || a.sequence)
      return { ...a, detail: `${a.detail}${risks[partTierAt(meta, props, a.part)] ?? ""}` };
    const target = a.address === instance ? "root" : a.address.slice(instance.length + 1);
    const choice = a.nestedChoice
      ? { choices: readChoices(a.nestedChoice.options, false), selected: a.nestedChoice.current }
      : a.action === "select"
        ? offeredChoices(meta, props, target)
        : undefined;
    const item = itemEditAt(meta, props, target);
    const set = a.action === "set" && (a.numeric ?? setAt(meta, props, target));
    const linked = a.action === "type" && linkedInput(meta, target);
    const value =
      a.action === "type" && item?.spec.action === "type"
        ? item.row[item.spec.prop]
        : linked
          ? props[linked.prop]
          : choice
            ? choice.selected
            : set
              ? a.numeric?.spec.declared ||
                isRuntimeSet(set.spec) ||
                values[`${instance}/${controlValueKey(def, set.key)}`] !== undefined
                ? set.value
                : undefined
              : a.input?.kind === "text"
                ? (answers?.[target] ?? values[`${instance}/${liveInputKey(target, "type")}`])
                : (values[`${a.address}/$draft`] ?? answers?.[target] ?? values[a.address]);
    let detail = credentialDetail(meta, props, a, target, value) ?? booleanDetail(a, value);
    const offered = a.action === "select" && !choice ? runtimeRowValue(meta, props, target, value) : value;
    if (offered !== undefined && ["type", "set", "select"].includes(a.action))
      detail = ` = ${JSON.stringify(offered)}`;
    if (choice)
      detail += `${detail ? ";" : ""} choices ${JSON.stringify(choice.choices.map(({ offered }) => offered))}`;
    if (a.move) detail = ` = ${JSON.stringify(a.move.current)}; choices ${JSON.stringify(a.move.choices)}`;
    if (a.numeric?.spec.declared) {
      const { min, max, step } = a.numeric.spec;
      const limits = [
        Number.isFinite(min) ? `min ${min}` : "",
        Number.isFinite(max) ? `max ${max}` : "",
        step === undefined ? "" : `step ${step}`,
      ].filter(Boolean);
      if (limits.length) detail += `; ${limits.join(", ")}`;
    }
    return { ...a, detail: `${detail}${risks[partTierAt(meta, props, a.part)] ?? ""}` };
  });
}

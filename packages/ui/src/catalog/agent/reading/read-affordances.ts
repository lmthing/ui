import type { Definition } from "../../probes";
import { liveInputKey } from "../live-inputs";
import { linkedInput } from "../linked-edits";
import {
  choiceOptions,
  controlValueKey,
  partTierAt,
  resolveChoice,
  selectionOffer,
  sessionActionProps,
  type Affordance,
  type SessionState,
  type Values,
} from "../index";
import { setAt } from "../clocks";
import { itemEditAt } from "../report-edits";

const risks: Record<string, string> = {
  ok: " !needs-ok",
  people: " !needs-people",
  service: " !needs-service",
};

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
    const risk = risks[partTierAt(meta, props, a.part)] ?? "";
    const target = a.address === instance ? "root" : a.address.slice(instance.length + 1);
    const options = a.action === "select" && choiceOptions(meta, props, target);
    const item = itemEditAt(meta, props, target);
    const selected = options
      ? item?.spec.action === "select"
        ? item.row[item.spec.prop]
        : props[selectionOffer(meta, target)!.prop]
      : undefined;
    // Advertise a label only when copying it back selects this option.
    const choices =
      options &&
      options.map(({ label, value }) => ({
        value,
        offered: label !== undefined && resolveChoice(options, label)?.value === value ? label : value,
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
              ? values[`${instance}/${controlValueKey(def, set.key)}`] === undefined
                ? undefined
                : set.value
              : a.input?.kind === "text"
                ? (answers?.[target] ?? values[`${instance}/${liveInputKey(target, "type")}`])
                : (values[`${a.address}/$draft`] ?? answers?.[target] ?? values[a.address]);
    let detail = a.detail;
    if (typeof value === "boolean" && a.action === "toggle") detail = `:${value ? "on" : "off"}`;
    if (!a.input && typeof value === "boolean" && a.action === "check")
      detail = `:${value ? "done" : "todo"}`;
    if (value !== undefined && ["type", "set", "select"].includes(a.action))
      detail = ` = ${JSON.stringify(value)}`;
    if (choices) {
      detail += `${detail ? ";" : ""} choices ${JSON.stringify(choices.map(({ offered }) => offered))}`;
    }
    if (a.move) detail = ` = ${JSON.stringify(a.move.current)}; choices ${JSON.stringify(a.move.choices)}`;
    return { ...a, detail: `${detail}${risk}` };
  });
}

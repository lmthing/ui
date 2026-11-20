import type { Definition } from "../../probes";
import {
  choiceValues,
  controlValueKey,
  numericSetAt,
  partTierAt,
  selectionOffer,
  sessionActionProps,
  type Affordance,
  type SessionState,
  type Values,
} from "../index";

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
    const choices = a.action === "select" && choiceValues(meta, props, target);
    const set = a.action === "set" && numericSetAt(meta, props, target);
    const value = choices
      ? props[selectionOffer(meta, target)!.prop]
      : set
        ? values[`${instance}/${controlValueKey(def, set.key)}`] === undefined
          ? undefined
          : set.value
        : (values[`${a.address}/$draft`] ?? answers?.[target] ?? values[a.address]);
    let detail = a.detail;
    if (typeof value === "boolean" && a.action === "toggle") detail = `:${value ? "on" : "off"}`;
    if (typeof value === "boolean" && a.action === "check") detail = `:${value ? "done" : "todo"}`;
    if (value !== undefined && ["type", "set", "select"].includes(a.action))
      detail = ` = ${JSON.stringify(value)}`;
    if (choices) detail += `${detail ? ";" : ""} choices ${JSON.stringify(choices)}`;
    return { ...a, detail: `${detail}${risk}` };
  });
}

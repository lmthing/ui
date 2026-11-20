import type { Meta } from "../meta";
import type { StateName } from "../types";
import { choiceValues, isNestedTarget, nestedControls, nestedRemaining } from "./selection";
import { adjustmentAt, clockActionValid } from "./clocks";
import { drawAvailable, drawRole, drawStatus } from "./draw";
import { sessionAvailable, sessionEvent, sessionState, sessionStatus } from "./session";

export type Affordance = {
  address: string;
  part: string;
  action: string;
  detail: string;
  blocked?: "max_active";
};
type Props = Record<string, unknown>;

const firstBoolean = (value: Props) => Object.values(value).find((v) => typeof v === "boolean");

function detailOf(action: string, holder: Props): string {
  if ((action === "press" || action === "select") && typeof holder.goto === "string")
    return `→${holder.goto}`;
  if (action === "toggle" && ["on", "off"].includes(String(holder.value))) return `:${holder.value}`;
  if (action === "toggle" || action === "check") {
    const on = firstBoolean(holder);
    if (on !== undefined) return action === "check" ? `:${on ? "done" : "todo"}` : `:${on ? "on" : "off"}`;
    if (typeof holder.trail === "string") return "";
  }
  return "";
}

type When = Record<string, Record<string, string | boolean>> | undefined;

/** A rule matches when every key equals its value, read from the item first, then the component. */
function matches(rule: Record<string, string | boolean> | undefined, holder: Props, outer: Props): boolean {
  return (
    !rule ||
    Object.entries(rule).every(([key, value]) => (key in holder ? holder[key] : outer[key]) === value)
  );
}

/** A part exists when its `when` matches and, if named like an optional prop, that prop is set. */
function present(part: string, holder: Props, when: When, outer: Props): boolean {
  if (!matches(when?.[part], holder, outer)) return false;
  return !(part in holder) || holder[part] !== undefined;
}

function partsOf(
  spec: Record<string, readonly string[]> | undefined,
  holder: Props,
  base: string,
  when: When,
  outer: Props,
) {
  return Object.entries(spec ?? {}).flatMap(([part, actions]) =>
    present(part, holder, when, outer)
      ? actions
          .filter((action) => matches(when?.[`${part}.${action}`], holder, outer))
          .map((action) => {
            const target = (holder[part] as Props | undefined) ?? holder;
            const nested = typeof target === "object" && target !== holder ? target : holder;
            return {
              address: part === "root" ? base : `${base}/${part}`,
              part,
              action,
              detail: detailOf(action, nested),
            };
          })
      : [],
  );
}

/**
 * Every action a model may take on one component instance, with its address relative to the screen
 * (`l1/r1/trail`). The reader prints these and act checks verify each one exists on screen.
 */
export function affordancesOf(
  meta: Meta,
  props: Props,
  instance: string,
  values: Props = {},
  state = (props.state as StateName | undefined) ?? "filled",
  includeBlocked = false,
): Affordance[] {
  const when = meta.actions?.when as When;
  const own = ownActions(meta, props, instance, when);
  const key = meta.items?.key;
  const items = key && Array.isArray(props[key]) ? (props[key] as Props[]) : [];
  // `$first` in a rule is true only for the first item (the top card of a stack).
  const itemActions = items.flatMap((item, index) =>
    partsOf(
      meta.actions?.items as Record<string, readonly string[]>,
      item,
      `${instance}/${String(item.id)}`,
      when,
      { ...props, $first: index === 0 },
    ),
  );
  const offered = [...own, ...nestedActions(meta, props, instance, itemActions, includeBlocked)];
  const runtime = values[`${instance}/$runtime`];
  const get = (part: string) => values[`${instance}/${part}`];
  state = sessionStatus(meta, props, drawStatus(meta, props, state, get), get);
  const session = sessionState(meta, props, get);
  const now = Number(get("$now") ?? Date.now());
  return offered.filter(({ address, action, part }) => {
    const target = address === instance ? "root" : address.slice(instance.length + 1);
    const role = drawRole(meta, target, action);
    if (!allowedIn(meta, state, `${part}.${action}`, Boolean(role))) return false;
    const event = sessionEvent(meta, target, action);
    if (event && !sessionAvailable(session, event)) return false;
    if (role && !drawAvailable(meta, props, get, target, role)) return false;
    if (!runtime && !meta.set && !meta.items?.set) return true;
    const adjustment = adjustmentAt(meta, props, target, action, get, now);
    if (!runtime) return !adjustment?.atSet || adjustment.next !== undefined;
    return (
      (!adjustment || adjustment.next !== undefined) &&
      clockActionValid(meta, props, target, action, get, now)
    );
  });
}

function nestedActions(
  meta: Meta,
  props: Props,
  instance: string,
  items: Affordance[],
  includeBlocked: boolean,
) {
  const controls = nestedControls(meta, props);
  const targets = new Set(controls.map(({ target }) => `${instance}/${target}`));
  const policy = meta.items?.nested;
  const full = nestedRemaining(meta, props, controls) === 0;
  const nested = controls.flatMap(({ enabled, target, part, spec, item }): Affordance[] => {
    if (!enabled) return [];
    const value = item[spec.prop];
    const blocked = full && spec.action === "toggle" && value !== true;
    if (blocked && !includeBlocked) return [];
    const detail =
      spec.action === "toggle"
        ? value
          ? ":on"
          : ":off"
        : value === undefined
          ? ""
          : ` = ${JSON.stringify(value)}`;
    return [
      {
        address: `${instance}/${target}`,
        part,
        action: spec.action,
        detail,
        ...(blocked ? { blocked: "max_active" } : {}),
      },
    ];
  });
  const reserved = policy?.activeParent || policy?.maxActive !== undefined;
  const ordinary = items.filter(
    ({ address }) =>
      !targets.has(address) && !(reserved && isNestedTarget(meta, address.slice(instance.length + 1))),
  );
  return [...ordinary, ...nested];
}

function allowedIn(meta: Meta, state: StateName, pair: string, draw: boolean) {
  if (state === "filled") return true;
  if (state === "empty") return meta.emptyActions?.some((allowed) => allowed === pair);
  return state === "success" && (draw || meta.successActions?.some((allowed) => allowed === pair));
}

function ownActions(meta: Meta, props: Props, instance: string, when: When) {
  return partsOf(
    meta.actions?.parts as Record<string, readonly string[]>,
    props,
    instance,
    when,
    props,
  ).flatMap((a) => {
    const choices = a.action === "select" ? choiceValues(meta, props, a.part) : undefined;
    return choices === undefined ? [a] : choices.length ? [{ ...a, detail: "" }] : [];
  });
}

/** Every action names its own address, so a model copies it and never assembles one: `[l1/r1/trail toggle:on]`. */
export function formatAffordance({ address, action, detail }: Affordance): string {
  return `[${address} ${action}${detail}]`;
}

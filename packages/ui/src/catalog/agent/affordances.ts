import type { Meta } from "../meta";
import type { StateName, Tier } from "../types";
import { choiceValues } from "./validate-value";
import { adjustmentAt, clockActionValid } from "./clocks";
import { drawAvailable, drawRole, drawStatus } from "./draw";
import { sessionAvailable, sessionEvent, sessionState, sessionStatus } from "./session";
import { addressedItems, matches, nestedActions, visibleItems } from "./visibility";
import { sendDraft, withLiveInput, type LiveInput } from "./live-inputs";
import type { SendDraft } from "./act";

export type Affordance = {
  address: string;
  part: string;
  action: string;
  detail: string;
  input?: LiveInput;
  send?: SendDraft;
  blocked?: "max_active";
  togglePeers?: readonly string[];
};
type Props = Record<string, unknown>;

type Adjustment = NonNullable<ReturnType<typeof adjustmentAt>>;

/** Item increments without a numeric setter or a clock are owned by the pure action planner. */
export function isAdjustOnlyItem(
  adjustment: Adjustment | undefined,
  action: string,
): adjustment is Adjustment & { clock: undefined; atSet: undefined } {
  return Boolean(
    (action === "increment" || action === "decrement") &&
    !adjustment?.clock &&
    !adjustment?.atSet &&
    adjustment?.key.includes("/$adjust/"),
  );
}

const firstBoolean = (value: Props) => Object.values(value).find((v) => typeof v === "boolean");

function detailOf(action: string, holder: Props, suppressLink: boolean): string {
  if (!suppressLink && (action === "press" || action === "select") && typeof holder.goto === "string")
    return `→${holder.goto}`;
  if (action === "toggle" && ["on", "off"].includes(String(holder.value))) return `:${holder.value}`;
  if (action === "toggle" || action === "check") {
    const on = firstBoolean(holder);
    if (on !== undefined) return action === "check" ? `:${on ? "done" : "todo"}` : `:${on ? "on" : "off"}`;
  }
  return "";
}

type When = Record<string, Record<string, string | boolean>> | undefined;

function partsOf(
  spec: Record<string, readonly string[]> | undefined,
  holder: Props,
  base: string,
  when: When,
  outer: Props,
  meta: Meta,
  item = false,
) {
  const noGoto = item ? meta.actions?.noGoto?.items : meta.actions?.noGoto?.parts;
  return Object.entries(spec ?? {}).flatMap(([part, actions]) =>
    matches(when?.[part], holder, outer) &&
    (!(part in holder) ||
      holder[part] !== undefined ||
      (!item && (meta.selections?.[part]?.runtime || Object.hasOwn(meta.live?.text ?? {}, part))))
      ? actions
          .filter((action) => matches(when?.[`${part}.${action}`], holder, outer))
          .map((action) => {
            const target = holder[part];
            const nested = target && typeof target === "object" ? (target as Props) : holder;
            const suppressLink = action === "press" && nested === holder && !!noGoto?.includes(part);
            return {
              address: part === "root" ? base : `${base}/${part}`,
              part,
              action,
              detail: detailOf(action, nested, suppressLink),
              ...withLiveInput(meta, part, action, holder, item),
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
  const get = (part: string) => values[`${instance}/${part}`];
  state = sessionStatus(meta, props, drawStatus(meta, props, state, get), get);
  if (meta.errorActions) props = { ...props, state };
  const { parts, items: itemParts, when } = meta.actions ?? {};
  const own = partsOf(parts, props, instance, when, props, meta).flatMap((a) => {
    const send = a.action === "send" ? sendDraft(meta, props, a.part, instance) : undefined;
    if (send !== undefined) return send ? [{ ...a, send }] : [];
    const choices = a.action === "select" ? choiceValues(meta, props, a.part) : undefined;
    return choices === undefined ? [a] : choices.length ? [{ ...a, detail: "" }] : [];
  });
  const items = addressedItems(meta, props);
  const visible = meta.items?.visibleWhen && new Set(visibleItems(meta, props));
  // `$first` in a rule is true only for the first item (the top card of a stack).
  const itemActions = items.flatMap((item, index) => {
    if (visible && !visible.has(item)) return [];
    const base = `${instance}/${String(item.id)}`;
    return partsOf(itemParts, item, base, when, { ...props, $first: index === 0 }, meta, true);
  });
  const runtime = values[`${instance}/$runtime`];
  const nested = nestedActions(meta, props, instance, itemActions, get, includeBlocked);
  const hidden = visible && new Set(items.filter((item) => !visible.has(item)).map(({ id }) => id));
  const offered = [
    ...own,
    ...nested.filter(
      ({ address }) => !hidden || !hidden.has(address.slice(instance.length + 1).split("/")[0]),
    ),
  ];
  const session = sessionState(meta, props, get);
  const now = Number(get("$now") ?? Date.now());
  return offered.filter(({ address, action, part }) => {
    const target = address === instance ? "root" : address.slice(instance.length + 1);
    const role = drawRole(meta, target, action);
    if (!allowedIn(meta, state, `${part}.${action}`, Boolean(role))) return false;
    const event = sessionEvent(meta, target, action);
    if (event && !sessionAvailable(session, event)) return false;
    if (role && !drawAvailable(meta, props, get, target, role)) return false;
    if ((runtime || meta.live?.derive) && !clockActionValid(meta, props, target, action, get, now))
      return false;
    if (!runtime && !meta.set && !meta.items?.set && !meta.items?.adjust) return true;
    const adjustment = adjustmentAt(meta, props, target, action, get, now);
    if (!runtime)
      return (!adjustment?.atSet && !isAdjustOnlyItem(adjustment, action)) || adjustment?.next !== undefined;
    return !adjustment || adjustment.next !== undefined;
  });
}

function allowedIn(meta: Meta, state: StateName, pair: string, draw: boolean) {
  const errorOnly = meta.errorActions?.some((allowed) => allowed === pair);
  if (state === "error" || errorOnly) return state === "error" && errorOnly;
  if (state === "filled") return true;
  if (state === "empty") return meta.emptyActions?.some((allowed) => allowed === pair);
  return state === "success" && (draw || meta.successActions?.some((allowed) => allowed === pair));
}

/** Resolve a part against live props, without changing the component's tier. */
export function partTierAt(meta: Meta, props: Props, part: string): Tier {
  const rule = Object.hasOwn(meta.partTiersBy ?? {}, part) ? meta.partTiersBy![part] : undefined;
  const value = rule && props[rule.prop];
  if (rule && ["string", "number", "boolean"].includes(typeof value)) {
    const key = String(value);
    if (Object.hasOwn(rule.tiers, key) && rule.tiers[key]) return rule.tiers[key];
  }
  return meta.partTiers?.[part] ?? meta.tier;
}

/** Every action names its own address, so a model copies it and never assembles one: `[l1/r1/trail toggle:on]`. */
export function formatAffordance({ address, action, detail }: Affordance): string {
  return `[${address} ${action}${detail}]`;
}

import type { LocalStateEvent, Meta } from "../meta";
import type { Definition } from "../probes";
import type { StateName, Tier } from "../types";
import { choiceValues } from "./validate-value";
import { adjustmentAt, clockActionValid, clockControlDeclared, hasNumericRoom } from "./clocks";
import { drawAvailable, drawRole, drawStatus } from "./draw";
import { sessionActionProps, sessionAvailable, sessionEvent, sessionState, sessionStatus } from "./session";
import { addressedItems, nestedActions, visibleItems } from "./visibility";
import { sendDraft, type LiveInput } from "./live-inputs";
import type { SendDraft } from "./act";
import { boundActionAvailable, isItemOffer } from "./selection-binding";
import { itemActionOffer, partsOf } from "./action-input";
import type { DeviceData } from "./device-data";
import { hostOffer, type HostActionPolicy, type HostIntent } from "./host-commands";

export type Affordance = {
  address: string;
  readAddress?: string;
  part: string;
  action: string;
  detail: string;
  input?: LiveInput;
  send?: SendDraft;
  blocked?: "max_active";
  togglePeers?: readonly string[];
  nestedStep?: { key: string; next: number };
  move?: { current: string | null; choices: string[] };
  hostIntent?: HostIntent;
  localEvent?: Omit<LocalStateEvent, "value">;
  hostReveal?: true;
};
type Props = Record<string, unknown>;
type OfferContext = {
  data?: DeviceData | undefined;
  wire?: Props | undefined;
  schema?: Definition["props"];
  clock?: ((target: string, action: string) => boolean) | undefined;
  host?: HostActionPolicy | undefined;
};
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

function actionsForItem(
  meta: Meta,
  props: Props,
  item: Props,
  instance: string,
  first: boolean,
  { data, wire, schema }: OfferContext,
) {
  const { items, when } = meta.actions ?? {};
  const id = String(item.id);
  return partsOf(items, item, `${instance}/${id}`, when, { ...props, $first: first }, meta, true, data, wire)
    .filter(({ part, action }) => {
      const picker = Object.hasOwn(meta.items?.pickers ?? {}, part);
      const needsChoices =
        (picker && action === "press") ||
        (action === "select" && (picker || meta.items?.edits?.[part]?.action === "select"));
      return !needsChoices || Boolean(choiceValues(meta, props, `${id}/${part}`)?.length);
    })
    .flatMap((offer) => itemActionOffer(meta, props, item, offer, schema));
}

function ownActions(meta: Meta, props: Props, instance: string) {
  const { parts, when } = meta.actions ?? {};
  return partsOf(parts, props, instance, when, props, meta).flatMap((a) => {
    if ((a.action === "move" && meta.items?.move) || !hasNumericRoom(meta, props, a.part, a.action))
      return [];
    const send = a.action === "send" ? sendDraft(meta, props, a.part, instance) : undefined;
    if (send !== undefined) return send ? [{ ...a, send }] : [];
    const choices = a.action === "select" ? choiceValues(meta, props, a.part) : undefined;
    return choices === undefined ? [a] : choices.length ? [{ ...a, detail: "" }] : [];
  });
}

function itemActionsOf(
  meta: Meta,
  props: Props,
  instance: string,
  items: Props[],
  context: OfferContext,
  get: (part: string) => unknown,
  includeBlocked: boolean,
) {
  const visible = (meta.items?.visibleWhen || meta.items?.records) && new Set(visibleItems(meta, props));
  // `$first` in a rule is true only for the first item (the top card of a stack).
  const actions = items.flatMap((item, index) =>
    visible && !visible.has(item) ? [] : actionsForItem(meta, props, item, instance, index === 0, context),
  );
  const hidden = visible && new Set(items.filter((item) => !visible.has(item)).map(({ id }) => id));
  return nestedActions(meta, props, instance, actions, get, includeBlocked).filter(
    ({ address }) => !hidden || !hidden.has(address.slice(instance.length + 1).split("/")[0]),
  );
}

/** Every offered action, addressed relative to the screen (`l1/r1/trail`). */
export function affordancesOf(
  meta: Meta,
  props: Props,
  instance: string,
  values: Props = {},
  state = (props.state as StateName | undefined) ?? "filled",
  includeBlocked = false,
  context: OfferContext = {},
): Affordance[] {
  const get = (part: string) => values[`${instance}/${part}`];
  state = sessionStatus(meta, props, drawStatus(meta, props, state, get), get);
  const session = sessionState(meta, props, get);
  props = sessionActionProps(meta, props, session);
  if (meta.errorActions) props = { ...props, state };
  const items = addressedItems(meta, props);
  const nested = itemActionsOf(meta, props, instance, items, context, get, includeBlocked);
  const runtime = values[`${instance}/$runtime`];
  const now = Number(get("$now") ?? Date.now());
  const liveClock = runtime || meta.live?.derive || meta.recordRuntime?.actions;
  const feedback = state === "error" && session?.kind === "rounds" && session.assessment?.correct === false;
  const rows = meta.hostCommands ? new Map(items.map((item) => [String(item.id), item])) : undefined;
  const offered = [...ownActions(meta, props, instance), ...nested].filter((offer) => {
    const { address, action, part } = offer;
    if (!boundActionAvailable(meta, props, part, action, isItemOffer(instance, offer))) return false;
    const target = address === instance ? "root" : address.slice(instance.length + 1);
    const role = drawRole(meta, target, action);
    const event = sessionEvent(meta, target, action);
    if (!allowedIn(meta, state, `${part}.${action}`, Boolean(role), feedback)) return false;
    if (context.clock && !context.clock(target, action)) return false;
    if (event && !sessionAvailable(session, event)) return false;
    if (role && !drawAvailable(meta, props, get, target, role)) return false;
    if (
      (liveClock || clockControlDeclared(meta, target, action, true)) &&
      !clockActionValid(meta, props, target, action, get, now)
    )
      return false;
    if (!runtime && !meta.set && !meta.items?.set && !meta.items?.adjust) return true;
    const adjustment = adjustmentAt(meta, props, target, action, get, now);
    if (!runtime)
      return (!adjustment?.atSet && !isAdjustOnlyItem(adjustment, action)) || adjustment?.next !== undefined;
    return !adjustment || adjustment.next !== undefined;
  });
  if (!meta.hostCommands && !context.host) return offered;
  return offered.flatMap((offer) => {
    const allowed = hostOffer(
      meta,
      props,
      instance,
      offer,
      partTierAt(meta, props, offer.part),
      context.host,
      rows,
    );
    return allowed ? [allowed] : [];
  });
}

function allowedIn(meta: Meta, state: StateName, pair: string, draw: boolean, feedback: boolean) {
  const errorOnly = meta.errorActions?.some((allowed) => allowed === pair);
  if (errorOnly) return state === "error";
  if (state === "filled") return true;
  if (state === "empty") return meta.emptyActions?.some((allowed) => allowed === pair);
  if (state === "loading") return meta.loadingActions?.some((allowed) => allowed === pair);
  return (
    (state === "success" || feedback) && (draw || meta.successActions?.some((allowed) => allowed === pair))
  );
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
export function formatAffordance({ address, readAddress = address, action, detail }: Affordance): string {
  return `[${readAddress} ${action}${detail}]`;
}

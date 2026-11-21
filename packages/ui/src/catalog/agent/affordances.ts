import type { Meta } from "../meta";
import type { Definition } from "../probes";
import type { StateName, Tier } from "../types";
import { choiceValues } from "./validate-value";
import { adjustmentAt, clockActionValid, clockControlDeclared, hasNumericRoom } from "./clocks";
import { drawAvailable, drawRole, drawStatus } from "./draw";
import { buzzAvailable, buzzRound, buzzStatus, buzzTarget } from "./buzz";
import { sessionActionProps, sessionAvailable, sessionEvent, sessionState, sessionStatus } from "./session";
import { addressedItems, nestedActions, visibleItems } from "./visibility";
import { sendDraft, type LiveInput } from "./live-inputs";
import type { SendDraft } from "./act";
import { boundActionAvailable, isItemOffer } from "./selection-binding";
import { itemActionOffer, partsOf } from "./action-input";
import type { DeviceData } from "./device-data";

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
  move?: { current: string | null; choices: string[] };
};
type Props = Record<string, unknown>;
type OfferContext = {
  data?: DeviceData | undefined;
  wire?: Props | undefined;
  schema?: Definition["props"];
  clock?: ((target: string, action: string) => boolean) | undefined;
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

function actionsForComponent(meta: Meta, props: Props, instance: string) {
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
  state = buzzStatus(meta, props, state, get);
  const round = buzzRound(meta, props, get);
  const session = sessionState(meta, props, get);
  props = sessionActionProps(meta, props, session);
  if (meta.errorActions) props = { ...props, state };
  const own = actionsForComponent(meta, props, instance);
  const items = addressedItems(meta, props);
  const visible = (meta.items?.visibleWhen || meta.items?.records) && new Set(visibleItems(meta, props));
  // `$first` in a rule is true only for the first item (the top card of a stack).
  const itemActions = items.flatMap((item, index) =>
    visible && !visible.has(item) ? [] : actionsForItem(meta, props, item, instance, index === 0, context),
  );
  const runtime = values[`${instance}/$runtime`];
  const nested = nestedActions(meta, props, instance, itemActions, get, includeBlocked);
  const hidden = visible && new Set(items.filter((item) => !visible.has(item)).map(({ id }) => id));
  const visibleNested = nested.filter(
    ({ address }) => !hidden || !hidden.has(address.slice(instance.length + 1).split("/")[0]),
  );
  const now = Number(get("$now") ?? Date.now());
  const liveClock = runtime || meta.live?.derive || meta.recordRuntime?.actions;
  const feedback = state === "error" && session?.kind === "rounds" && session.assessment?.correct === false;
  return [...own, ...visibleNested].filter((offer) => {
    const { address, action, part } = offer;
    if (!boundActionAvailable(meta, props, part, action, isItemOffer(instance, offer))) return false;
    const target = address === instance ? "root" : address.slice(instance.length + 1);
    const role = drawRole(meta, target, action);
    const event = sessionEvent(meta, target, action);
    const buzz = buzzTarget(meta, target, action);
    if (!allowedIn(meta, state, `${part}.${action}`, Boolean(role), feedback)) return false;
    if (context.clock && !context.clock(target, action)) return false;
    if (event && !sessionAvailable(session, event)) return false;
    if (role && !drawAvailable(meta, props, get, target, role)) return false;
    if (buzz !== null && !buzzAvailable(round, buzz)) return false;
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
}

function allowedIn(meta: Meta, state: StateName, pair: string, draw: boolean, feedback: boolean) {
  const errorOnly = meta.errorActions?.some((allowed) => allowed === pair);
  if (errorOnly) return state === "error";
  if (state === "filled") return true;
  if (state === "empty") return meta.emptyActions?.some((allowed) => allowed === pair);
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

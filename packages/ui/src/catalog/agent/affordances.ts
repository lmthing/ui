import type { LocalStateEvent, Meta } from "../meta";
import type { Definition } from "../probes";
import type { StateName } from "../types";
import { choiceValues, type ChoiceOption } from "./validate-value";
import { clockActionValid, clockControlDeclared, type numericSetAt } from "./clocks";
import { drawAvailable, drawRole, drawStatus } from "./draw";
import { buzzAvailable, buzzRound, buzzStatus, buzzTarget } from "./buzz";
import { sessionActionProps, sessionAvailable, sessionEvent, sessionState, sessionStatus } from "./session";
import { actionAllowedIn, addressedItems, nestedActions, visibleItems } from "./visibility";
import { sendDraft, type LiveInput } from "./live-inputs";
import type { SendDraft } from "./act";
import { boundActionAvailable, isItemOffer } from "./selection-binding";
import { itemActionOffer, partsOf } from "./action-input";
import { activeDateSpan, dateSpanOffer } from "./date-span";
import { collectionOffers } from "./collections";
import type { HostActionPolicy, HostIntent } from "./host-commands";
import { deviceTimeOf, type DeviceData } from "./device-data";
import { isLocalAnchorAction } from "./drives";
import { keypadOffers, type KeypadProfile } from "./keypad-profile";
import {
  mediaAffordance,
  mediaOffer,
  sequenceAffordance,
  type MediaOffer,
  type stageSequence,
} from "./media";

import { hostOffers, partTierAt } from "./offer-policies";
export { partTierAt } from "./offer-policies";
import { numericOffer, type Adjustment } from "./numeric-offer";
export { isAdjustOnlyItem } from "./numeric-offer";

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
  jump?: true;
  dateSpan?: true;
  move?: { current: string | null; choices: string[] };
  hostIntent?: HostIntent;
  localEvent?: Omit<LocalStateEvent, "value">;
  hostReveal?: true;
  hostSecret?: "copy" | "input" | "verify";
  keypad?: { profile: KeypadProfile; initial: string };
  slotMove?: { key: string; orders: ReadonlyMap<string, string[]> };
  rowSelection?: { key: string; id: string; value: string | number };
  flagKey?: string;
  nestedChoice?: { options: ChoiceOption[]; current: unknown };
  replaceToggles?: readonly string[];
  numeric?: NonNullable<ReturnType<typeof numericSetAt>>;
  adjustment?: Adjustment;
  media?: MediaOffer;
  sequence?: Parameters<typeof stageSequence>[0];
};
type Props = Record<string, unknown>;
type OfferContext = {
  data?: DeviceData | undefined;
  wire?: Props | undefined;
  schema?: Definition["props"];
  baselineInput?: unknown;
  clock?: ((target: string, action: string) => boolean) | undefined;
  host?: HostActionPolicy | undefined;
  now?: number | undefined;
};
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
      if (!dateSpanOffer(meta, props, part, action, item)) return false;
      const picker = Object.hasOwn(meta.items?.pickers ?? {}, part);
      const needsChoices =
        (picker && action === "press") ||
        (action === "select" && (picker || meta.items?.edits?.[part]?.action === "select"));
      return !needsChoices || Boolean(choiceValues(meta, props, `${id}/${part}`)?.length);
    })
    .flatMap((offer) =>
      offer.part === "root" && offer.action === "select" && activeDateSpan(meta, props)
        ? [{ ...offer, dateSpan: true as const }]
        : itemActionOffer(meta, props, item, offer, schema),
    );
}

function actionsForComponent(meta: Meta, props: Props, instance: string, values: Props) {
  const { parts, when } = meta.actions ?? {};
  return partsOf(parts, props, instance, when, props, meta).flatMap((a) => {
    if (!dateSpanOffer(meta, props, a.part, a.action)) return [];
    if (a.action === "press" && meta.jump?.includes(a.part))
      return [{ ...a, detail: "", jump: true as const }];
    if (a.action === "move" && meta.items?.move) return [];
    const send = a.action === "send" ? sendDraft(meta, props, a.part, instance, values) : undefined;
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
  return nestedActions(meta, props, instance, actions, get, includeBlocked, context).filter(
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
  state = buzzStatus(meta, props, state, get);
  const round = buzzRound(meta, props, get);
  const session = sessionState(meta, props, get);
  props = sessionActionProps(meta, props, session);
  if (meta.errorActions) props = { ...props, state };
  const items = addressedItems(meta, props);
  const nested = itemActionsOf(meta, props, instance, items, context, get, includeBlocked);
  const runtime = values[`${instance}/$runtime`];
  const now = Number(get("$now") ?? context.now ?? deviceTimeOf(context.data) ?? Date.now());
  const liveClock = runtime || meta.live?.derive || meta.recordRuntime?.actions;
  const feedback = state === "error" && session?.kind === "rounds" && session.assessment?.correct === false;
  const rows = meta.hostCommands ? new Map(items.map((item) => [String(item.id), item])) : undefined;
  const available = [
    ...actionsForComponent(meta, props, instance, values),
    ...nested,
    ...collectionOffers(meta, props, instance),
  ].filter((offer) => {
    const { address, action, part } = offer;
    if (
      isLocalAnchorAction(action) &&
      (isItemOffer(instance, offer) || partTierAt(meta, props, part) !== "phone")
    )
      return false;
    if (!boundActionAvailable(meta, props, part, action, isItemOffer(instance, offer))) return false;
    const target = address === instance ? "root" : address.slice(instance.length + 1);
    const role = drawRole(meta, target, action);
    const event = sessionEvent(meta, target, action);
    const buzz = buzzTarget(meta, target, action);
    if (!actionAllowedIn(meta, state, `${part}.${action}`, Boolean(role), feedback)) return false;
    if (context.clock && !context.clock(target, action)) return false;
    if (event && !sessionAvailable(session, event)) return false;
    if (role && !drawAvailable(meta, props, get, target, role)) return false;
    if (buzz !== null && !buzzAvailable(round, buzz)) return false;
    return (
      !(liveClock || clockControlDeclared(meta, target, action, true)) ||
      clockActionValid(meta, props, target, action, get, now)
    );
  });
  const offered = available.flatMap((offer) => {
    const media = mediaOffer(meta, instance, offer);
    if (media) return mediaAffordance(meta, props, offer, media, instance, values);
    const sequence = sequenceAffordance(meta, props, instance, offer, get);
    return sequence.flatMap((item) =>
      item.sequence ? [item] : numericOffer(meta, props, instance, item, get, now, runtime, context.data),
    );
  });
  const host = hostOffers(meta, props, instance, offered, context.host, rows);
  return keypadOffers(host, context.schema, instance, props, items);
}

/** Every action names its own address, so a model copies it and never assembles one: `[l1/r1/trail toggle:on]`. */
export function formatAffordance({ address, readAddress = address, action, detail }: Affordance): string {
  return `[${readAddress} ${action}${detail}]`;
}

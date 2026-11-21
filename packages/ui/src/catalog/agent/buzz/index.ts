import type { Meta } from "../../meta";
import type { StateName } from "../../types";
import type { Values } from "../index";

export const buzzKey = "$buzz";
export const monotonicNow = () => globalThis.performance.now();

export type BuzzRound = Readonly<{ winner: string; deltas: Readonly<Record<string, number>> }>;
type StoredRound = Readonly<{ roster: string; at: number; round: BuzzRound }>;
type Get = (part: string) => unknown;
type BuzzMeta = Pick<Meta, "buzz" | "items">;

function rosterOf(meta: BuzzMeta, props: Values) {
  const players = meta.items && props[meta.items.key];
  // The runtime stamps positional ids; only the ordered player props identify a roster.
  return JSON.stringify(Array.isArray(players) ? players.map(({ id: _id, ...row }: Values) => row) : []);
}
function matchingRound(stored: unknown, roster: string) {
  const record = stored as StoredRound | undefined;
  return record?.roster === roster ? record : undefined;
}
export function buzzRound(meta: BuzzMeta, props: Values, get: Get) {
  return meta.buzz ? matchingRound(get(buzzKey), rosterOf(meta, props))?.round : undefined;
}
export function staleBuzz(meta: Meta, props: Values, stored: unknown) {
  return stored !== undefined && (!meta.buzz || !matchingRound(stored, rosterOf(meta, props)));
}

/** Null is not a buzz; an empty string is the component's reset. */
export function buzzTarget(meta: Meta, target: string, action: string): string | null {
  if (!meta.buzz || action !== "press") return null;
  if (target === meta.buzz.reset) return "";
  const [item, part, extra] = target.split("/");
  return item && part === meta.buzz.press && extra === undefined ? item : null;
}

export function buzzAvailable(round: BuzzRound | undefined, item: string): boolean {
  return !item || !round || !Object.hasOwn(round.deltas, item);
}

export function recordBuzz(
  meta: BuzzMeta,
  props: Values,
  get: Get,
  item: string,
  now: () => number,
): StoredRound | undefined {
  if (!item) return;
  const roster = rosterOf(meta, props);
  const previous = matchingRound(get(buzzKey), roster);
  if (previous && !buzzAvailable(previous.round, item)) return previous;
  const at = now();
  if (!previous) return { roster, at, round: { winner: item, deltas: { [item]: 0 } } };
  const { winner, deltas } = previous.round;
  return {
    roster,
    at: previous.at,
    round: { winner, deltas: { ...deltas, [item]: Math.max(0, at - previous.at) } },
  };
}

export function buzzStatus(meta: Meta, props: Values, state: StateName, get: Get): StateName {
  if (!meta.buzz || (state !== "filled" && state !== "success")) return state;
  return buzzRound(meta, props, get) ? "success" : "filled";
}

export function projectBuzz(meta: Meta, props: Values, get: Get): Values {
  return meta.buzz ? { ...props, [buzzKey]: buzzRound(meta, props, get) } : props;
}

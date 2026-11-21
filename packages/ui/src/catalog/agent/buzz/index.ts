import type { Meta } from "../../meta";
import type { StateName } from "../../types";
import type { Values } from "../index";

export const buzzKey = "$buzz";
export const monotonicNow = () => globalThis.performance.now();

export type BuzzRound = Readonly<{ winner: string; deltas: Readonly<Record<string, number>> }>;
type StoredRound = Readonly<{ at: number; round: BuzzRound }>;
type Get = (part: string) => unknown;

const storedRound = (get: Get) => get(buzzKey) as StoredRound | undefined;
export const buzzRound = (get: Get) => storedRound(get)?.round;

/** Null is not a buzz; an empty string is the component's reset. */
export function buzzTarget(meta: Meta, target: string, action: string): string | null {
  if (!meta.buzz || action !== "press") return null;
  if (target === meta.buzz.reset) return "";
  const [item, part, extra] = target.split("/");
  return item && part === meta.buzz.press && extra === undefined ? item : null;
}

export function buzzAvailable(get: Get, item: string): boolean {
  const round = buzzRound(get);
  return !item || !round || !Object.hasOwn(round.deltas, item);
}

export function recordBuzz(get: Get, item: string, now: () => number): StoredRound | undefined {
  if (!item) return;
  const previous = storedRound(get);
  if (previous && !buzzAvailable(get, item)) return previous;
  const at = now();
  if (!previous) return { at, round: { winner: item, deltas: { [item]: 0 } } };
  const { winner, deltas } = previous.round;
  return { at: previous.at, round: { winner, deltas: { ...deltas, [item]: Math.max(0, at - previous.at) } } };
}

export function buzzStatus(meta: Meta, state: StateName, get: Get): StateName {
  if (!meta.buzz || (state !== "filled" && state !== "success")) return state;
  return buzzRound(get) ? "success" : "filled";
}

export function projectBuzz(meta: Meta, props: Values, get: Get): Values {
  return meta.buzz ? { ...props, [buzzKey]: buzzRound(get) } : props;
}

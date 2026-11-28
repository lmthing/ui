import type { ScreenLike } from "../../catalog";

export type ReturnPoint = { from: string; to: string; address: string; top: number };

export function rememberRoute(history: ReturnPoint[], point: ReturnPoint, replace: boolean) {
  if (!replace) {
    history.push(point);
    return;
  }
  const incoming = history.at(-1);
  if (incoming?.to === point.from) incoming.to = point.to;
  else history.length = 0;
}

export function returnIndex(history: readonly ReturnPoint[], from: string, to: string) {
  for (let index = history.length - 1; index >= 0; index--) {
    const point = history[index]!;
    if (point.to === from && point.from === to) return index;
  }
  return -1;
}

/** Match actual host transitions, not just a Back press that may be rejected or intercepted. */
export function popReturnPoint(history: ReturnPoint[], from: string, to: string) {
  const index = returnIndex(history, from, to);
  if (index === -1) {
    history.length = 0;
    return undefined;
  }
  const [point] = history.splice(index);
  return point;
}

export function arrivalAddress(screen: ScreenLike) {
  const header = screen.components.find(({ c }) => c === "Header");
  return header && `${screen.id}/${header.id}/title`;
}

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

function partAt(root: HTMLElement, address: string | undefined) {
  if (!address) return undefined;
  return root.querySelector<HTMLElement>(`[data-testid="${CSS.escape(address)}"]`);
}

export function restoreWebArrival(root: HTMLElement, screen: ScreenLike, point?: ReturnPoint) {
  const body = root.querySelector<HTMLElement>("[data-kit-screen-body]");
  if (body && point) body.scrollTop = point.top;
  const opener = partAt(root, point?.address) ?? partAt(root, point && `${point.address}/root`);
  const fallback = partAt(root, arrivalAddress(screen)) ?? body;
  const target =
    opener && opener.tabIndex >= 0 && !opener.closest('[inert], [aria-hidden="true"], [aria-disabled="true"]')
      ? opener
      : fallback;
  if (!target) return;
  if (target === fallback && !target.hasAttribute("tabindex")) target.tabIndex = -1;
  target.focus({ preventScroll: true });
}

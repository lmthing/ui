const eventName = "kit-motion-settled";

/** Web transforms don't cause a layout notification. Refresh measured parts once, after they settle. */
export function announceMotionSettled(node: HTMLElement) {
  if (node.isConnected) node.dispatchEvent(new Event(eventName, { bubbles: true }));
}

export function listenMotionSettled(node: unknown, refresh: () => void) {
  if (typeof HTMLElement === "undefined" || !(node instanceof HTMLElement)) return;
  node.addEventListener(eventName, refresh);
  return () => node.removeEventListener(eventName, refresh);
}

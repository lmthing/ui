const eventName = "kit-motion-settled";

/** Web transforms don't cause a layout notification. Refresh measured parts once, after they settle. */
export function announceMotionSettled(node: HTMLElement) {
  if (node.isConnected) node.dispatchEvent(new Event(eventName, { bubbles: true }));
}

export function listenMotionSettled(node: unknown, part: () => unknown, refresh: () => void) {
  if (typeof HTMLElement === "undefined" || !(node instanceof HTMLElement)) return;
  const listener = (event: Event) => {
    const target = part();
    if (event.target instanceof Node && target instanceof Node && event.target.contains(target)) refresh();
  };
  node.addEventListener(eventName, listener);
  return () => node.removeEventListener(eventName, listener);
}

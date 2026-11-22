import { size } from "../../../catalog";
import { nearestScrollDelta, type ScrollActivity } from "./scroll-follow";

export function focusScroll(target: HTMLElement, node: HTMLElement) {
  if (target === node || !target.getBoundingClientRect) return;
  const box = target.getBoundingClientRect(),
    viewport = node.getBoundingClientRect();
  node.scrollBy({
    top: box.bottom > viewport.bottom ? box.bottom - viewport.bottom : Math.min(0, box.top - viewport.top),
    left: box.right > viewport.right ? box.right - viewport.right : Math.min(0, box.left - viewport.left),
  });
}

export function scrollKey(
  event: { key: string; target: unknown; currentTarget: unknown; preventDefault(): void },
  horizontal: boolean,
  manual: () => void,
) {
  if (event.target !== event.currentTarget) return;
  const node = event.currentTarget as HTMLElement;
  const page = horizontal ? node.clientWidth : node.clientHeight;
  const paging: [number, number] = horizontal ? [page, 0] : [0, page];
  const moves: Record<string, [number, number]> = {
    ArrowDown: [0, size.control.md],
    ArrowUp: [0, -size.control.md],
    ArrowRight: [size.control.md, 0],
    ArrowLeft: [-size.control.md, 0],
    PageDown: paging,
    PageUp: [-paging[0], -paging[1]],
    " ": paging,
  };
  if (event.key === "Home" || event.key === "End") {
    manual();
    event.preventDefault();
    node.scrollBy({
      top: (event.key === "Home" ? 0 : node.scrollHeight) - node.scrollTop,
      left: (event.key === "Home" ? 0 : node.scrollWidth) - node.scrollLeft,
    });
  } else if (moves[event.key]) {
    manual();
    event.preventDefault();
    const [left, top] = moves[event.key]!;
    node.scrollBy({ left, top });
  }
}

const autoScrollQuietMs = 200;
export type WebScrollMotion = { until: number; animating: boolean };

export function stopWebFollow(node: HTMLElement, auto: WebScrollMotion) {
  if (auto.animating && performance.now() < auto.until) {
    node.scrollTo({ left: node.scrollLeft, top: node.scrollTop, behavior: "instant" });
  }
  auto.animating = false;
}

export function listenForWebScroll(node: HTMLElement, activity: ScrollActivity, auto: WebScrollMotion) {
  const abort = new AbortController();
  const options = { passive: true, signal: abort.signal };
  const manual = () => {
    stopWebFollow(node, auto);
    auto.until = 0;
    activity.lastManual = performance.now();
  };
  listenForWebDrag(node, activity, manual, options);
  node.addEventListener("wheel", manual, options);
  node.addEventListener(
    "scroll",
    () => {
      const now = performance.now();
      if (now < auto.until) auto.until = now + autoScrollQuietMs;
      else manual();
    },
    options,
  );
  node.addEventListener(
    "scrollend",
    () => {
      auto.until = 0;
      auto.animating = false;
    },
    options,
  );
  return () => {
    activity.dragging = false;
    abort.abort();
  };
}

function listenForWebDrag(
  node: HTMLElement,
  activity: ScrollActivity,
  manual: () => void,
  options: AddEventListenerOptions,
) {
  let pointer: number | undefined;
  const touches = new Set<number>();
  const mark = () => {
    activity.dragging = pointer !== undefined || touches.size > 0;
    manual();
  };
  const window = node.ownerDocument.defaultView;
  const releasePointer = (event: PointerEvent) => {
    if (pointer !== event.pointerId) return;
    pointer = undefined;
    mark();
  };
  const releaseTouch = (event: TouchEvent) => {
    let ended = false;
    for (const touch of Array.from(event.changedTouches)) ended = touches.delete(touch.identifier) || ended;
    if (ended) mark();
  };
  node.addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType === "touch" || event.target !== node) return;
      pointer = event.pointerId;
      mark();
    },
    options,
  );
  // A browser cancels the pointer when native panning takes over, before the finger leaves.
  node.addEventListener(
    "touchstart",
    (event) => {
      for (const touch of Array.from(event.changedTouches)) touches.add(touch.identifier);
      mark();
    },
    options,
  );
  window?.addEventListener("pointerup", releasePointer, options);
  window?.addEventListener("pointercancel", releasePointer, options);
  window?.addEventListener("touchend", releaseTouch, options);
  window?.addEventListener("touchcancel", releaseTouch, options);
  window?.addEventListener(
    "blur",
    () => {
      if (!activity.dragging) return;
      pointer = undefined;
      touches.clear();
      mark();
    },
    options,
  );
}

export function revealWebPart(
  node: HTMLElement,
  target: HTMLElement,
  horizontal: boolean,
  animated: boolean,
  auto: WebScrollMotion,
) {
  if (!node.contains(target)) return;
  const viewport = node.getBoundingClientRect(),
    box = target.getBoundingClientRect();
  const extent = horizontal ? node.clientWidth : node.clientHeight;
  const scale = horizontal ? viewport.width / node.offsetWidth : viewport.height / node.offsetHeight;
  if (!scale) return;
  const edge = horizontal ? viewport.left + node.clientLeft * scale : viewport.top + node.clientTop * scale;
  const start = ((horizontal ? box.left : box.top) - edge) / scale;
  const end = ((horizontal ? box.right : box.bottom) - edge) / scale;
  const delta = nearestScrollDelta(start, end, extent);
  if (!delta) return;
  auto.until = performance.now() + autoScrollQuietMs;
  auto.animating = animated;
  node.scrollBy(
    horizontal
      ? { left: delta, behavior: animated ? "smooth" : "instant" }
      : { top: delta, behavior: animated ? "smooth" : "instant" },
  );
}

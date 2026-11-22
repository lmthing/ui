import { size } from "../../../catalog";
import { nearestScrollDelta, type ScrollActivity } from "./scroll-follow";

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
  let pointer: number | undefined;
  const manual = () => {
    stopWebFollow(node, auto);
    auto.until = 0;
    activity.lastManual = performance.now();
  };
  const release = (event?: PointerEvent) => {
    if (pointer === undefined || (event && pointer !== event.pointerId)) return;
    pointer = undefined;
    activity.dragging = false;
    manual();
  };
  node.addEventListener("wheel", manual, options);
  node.addEventListener("touchmove", manual, options);
  node.addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType !== "touch" && event.target !== node) return;
      pointer = event.pointerId;
      activity.dragging = true;
      manual();
    },
    options,
  );
  const window = node.ownerDocument.defaultView;
  window?.addEventListener("pointerup", release, options);
  window?.addEventListener("pointercancel", release, options);
  window?.addEventListener("blur", () => release(), options);
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
    release();
    abort.abort();
  };
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

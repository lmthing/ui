const manualScrollQuietMs = 200;
type ScrollOffset = { x: number; y: number };
export type ScrollActivity = {
  dragging: boolean;
  momentum: boolean;
  lastManual: number;
  offset?: ScrollOffset | undefined;
};

export function manualScrollActive(
  state: { dragging: boolean; momentum: boolean; lastManual: number },
  now: number,
) {
  return state.dragging || state.momentum || now - state.lastManual < manualScrollQuietMs;
}

/** Movement along one axis, as in scrollIntoView's nearest alignment. */
export function nearestScrollDelta(start: number, end: number, extent: number) {
  if (extent <= 0 || end <= start || (start <= 0 && end >= extent)) return 0;
  const oversized = end - start > extent;
  if (start < 0) return oversized ? end - extent : start;
  if (end > extent) return oversized ? start : end - extent;
  return 0;
}

export type ScrollHandle = {
  getScrollableNode?: () => HTMLElement;
  getInnerViewRef?: () => NativePosition | null;
  getNativeScrollRef?: () => NativePosition | null;
  scrollTo?: (options: { x: number; y: number; animated: boolean }) => void;
};

type NativePosition = { measureInWindow?: (success: (x: number, y: number) => void) => void };
export type NativePart = {
  measureLayout?: (
    ancestor: unknown,
    success: (x: number, y: number, width: number, height: number) => void,
    failure: () => void,
  ) => void;
};

/** Seed offsets if following was opted into after scrolling, before any native scroll event arrives. */
export function measureNativeOffset(scroll: ScrollHandle, measured: (offset: ScrollOffset) => void) {
  const viewport = scroll.getNativeScrollRef?.();
  const content = scroll.getInnerViewRef?.();
  if (!viewport?.measureInWindow || !content?.measureInWindow) return;
  let origin: ScrollOffset | undefined, inner: ScrollOffset | undefined;
  const report = () => {
    if (origin && inner) measured({ x: origin.x - inner.x, y: origin.y - inner.y });
  };
  viewport.measureInWindow((x, y) => {
    origin = { x, y };
    report();
  });
  content.measureInWindow((x, y) => {
    inner = { x, y };
    report();
  });
}

export function revealNativePart(
  scroll: ScrollHandle,
  target: NativePart,
  horizontal: boolean,
  animated: boolean,
  currentView: () => { offset: ScrollOffset; extent: number } | undefined,
) {
  const content = scroll.getInnerViewRef?.();
  if (!content) return;
  const axis = horizontal ? "x" : "y";
  let destination: number | undefined;
  target.measureLayout?.(
    content,
    (x, y, width, height) => {
      const view = currentView();
      if (!view) return;
      const start = (horizontal ? x : y) - view.offset[axis];
      const delta = nearestScrollDelta(start, start + (horizontal ? width : height), view.extent);
      if (!delta) return;
      const offset = view.offset[axis] + delta;
      if (animated) destination = offset;
      scroll.scrollTo?.({ ...view.offset, [axis]: offset, animated });
    },
    () => {},
  );
  return (offset: ScrollOffset) => {
    // Native scroll offsets can be rounded to the nearest physical pixel.
    if (destination === undefined || Math.abs(destination - offset[axis]) <= 1) return;
    scroll.scrollTo?.({ ...offset, animated: false });
  };
}

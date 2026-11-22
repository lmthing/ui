const manualScrollQuietMs = 200;
const androidDragRecoveryMs = 2_000;
type ScrollOffset = { x: number; y: number };
export type ScrollActivity = {
  dragging: boolean;
  momentum: boolean;
  lastManual: number;
  offset?: ScrollOffset | undefined;
  dragUntil?: number | undefined;
  command?: { offset: ScrollOffset; until: number } | undefined;
};

export function manualScrollActive(state: ScrollActivity, now: number) {
  return (
    (state.dragging && now < (state.dragUntil ?? Infinity)) ||
    state.momentum ||
    now - state.lastManual < manualScrollQuietMs
  );
}

export function beginNativeDrag(state: ScrollActivity, now: number, android: boolean) {
  state.dragging = true;
  state.momentum = false;
  state.lastManual = now;
  // Android may omit both the JS touch cancel and the end-drag event after native takeover.
  state.dragUntil = android ? now + androidDragRecoveryMs : undefined;
}

export function endNativeDrag(state: ScrollActivity, now: number) {
  if (!state.dragging) return;
  state.dragging = false;
  state.dragUntil = undefined;
  state.lastManual = now;
}

export function expectNativeFollow(state: ScrollActivity, offset: ScrollOffset, now: number) {
  state.command = { offset, until: now + manualScrollQuietMs };
}

export function recordNativeScroll(
  state: ScrollActivity,
  offset: ScrollOffset,
  now: number,
  android: boolean,
) {
  state.offset = offset;
  const command = state.command;
  state.command = undefined;
  // Android can emit unowned scrolling (including a mouse wheel) with no drag-start event.
  // Only the matching acknowledgement of our own instant scroll is exempt.
  const own =
    command &&
    now < command.until &&
    Math.abs(command.offset.x - offset.x) <= 1 &&
    Math.abs(command.offset.y - offset.y) <= 1;
  if (state.dragUntil !== undefined && now >= state.dragUntil) {
    state.dragging = false;
    state.dragUntil = undefined;
  }
  if (manualScrollActive(state, now) || (android && !own)) {
    state.lastManual = now;
    if (android && state.dragging) state.dragUntil = now + androidDragRecoveryMs;
  }
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
  onMove?: (offset: ScrollOffset) => void,
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
      const next = { ...view.offset, [axis]: offset };
      onMove?.(next);
      scroll.scrollTo?.({ ...next, animated });
    },
    () => {},
  );
  return (offset: ScrollOffset) => {
    // Native scroll offsets can be rounded to the nearest physical pixel.
    if (destination === undefined || Math.abs(destination - offset[axis]) <= 1) return;
    scroll.scrollTo?.({ ...offset, animated: false });
  };
}

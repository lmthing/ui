const manualScrollQuietMs = 200;
export type ScrollActivity = { dragging: boolean; momentum: boolean; lastManual: number; offset: number };

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
  getInnerViewRef?: () => unknown;
  scrollTo?: (options: { x: number; y: number; animated: boolean }) => void;
};

export type NativePart = {
  measureLayout?: (
    ancestor: unknown,
    success: (x: number, y: number, width: number, height: number) => void,
    failure: () => void,
  ) => void;
};

export function revealNativePart(
  scroll: ScrollHandle,
  target: NativePart,
  horizontal: boolean,
  animated: boolean,
  currentView: () => { offset: number; extent: number } | undefined,
) {
  const content = scroll.getInnerViewRef?.();
  if (!content) return;
  let destination: number | undefined;
  target.measureLayout?.(
    content,
    (x, y, width, height) => {
      const view = currentView();
      if (!view) return;
      const start = (horizontal ? x : y) - view.offset;
      const delta = nearestScrollDelta(start, start + (horizontal ? width : height), view.extent);
      if (!delta) return;
      const offset = view.offset + delta;
      if (animated) destination = offset;
      scroll.scrollTo?.({ x: horizontal ? offset : 0, y: horizontal ? 0 : offset, animated });
    },
    () => {},
  );
  return (offset: number) => {
    // Native scroll offsets can be rounded to the nearest physical pixel.
    if (destination === undefined || Math.abs(destination - offset) <= 1) return;
    scroll.scrollTo?.({ x: horizontal ? offset : 0, y: horizontal ? 0 : offset, animated: false });
  };
}

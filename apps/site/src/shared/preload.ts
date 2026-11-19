let started = false;

/** Starts loading the kit and the playground chunk, once. Called when idle and when a specimen is approached. */
export function preloadKit(): void {
  if (started) return;
  started = true;
  const ignore = () => undefined;
  void import("../live/Phone").catch(ignore);
  void import("../playground/ComponentPage").catch(ignore);
}

/** Preload after first paint, when the browser has nothing better to do. */
export function preloadWhenIdle(): void {
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
  if (idle) idle(preloadKit);
  else setTimeout(preloadKit, 2000);
}

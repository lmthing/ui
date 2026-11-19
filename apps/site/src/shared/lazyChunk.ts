import { lazy, type ComponentType, type LazyExoticComponent } from "react";

const flag = "lmthing-chunk-reload";

/** Reloads the page once (a session flag stops loops). Returns false when it already tried. */
export function reloadOnce(): boolean {
  try {
    if (sessionStorage.getItem(flag)) return false;
    sessionStorage.setItem(flag, "1");
  } catch {
    return false;
  }
  location.reload();
  return true;
}

const clearFlag = () => {
  try {
    sessionStorage.removeItem(flag);
  } catch {
    /* storage can be blocked */
  }
};

/**
 * `lazy` for code-split chunks. After a deploy an open tab asks for a chunk that no longer exists; the first
 * such failure reloads the page (new hashed names), a second one is thrown to the error boundary.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyChunk<T extends ComponentType<any>>(
  load: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() =>
    load().then(
      (module) => (clearFlag(), module),
      (error: unknown) => {
        if (reloadOnce()) return new Promise<never>(() => undefined);
        throw error;
      },
    ),
  );
}

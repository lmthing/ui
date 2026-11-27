import { useMemo, useSyncExternalStore } from "react";
import type { NativeHost } from "./environment";

/** Direct kit consumers must also respect the OS preference in either motion profile. */
export function useReducedMotion(enabled: boolean, host?: NativeHost) {
  const source = useMemo(() => {
    const media =
      enabled && !host && typeof window !== "undefined"
        ? window.matchMedia?.("(prefers-reduced-motion: reduce)")
        : undefined;
    return {
      subscribe(listener: () => void): () => void {
        if (enabled && host) return host.subscribe(listener);
        media?.addEventListener("change", listener);
        return () => media?.removeEventListener("change", listener);
      },
      snapshot: () => enabled && (host?.snapshot().reduceMotion ?? media?.matches ?? false),
    };
  }, [enabled, host]);
  return useSyncExternalStore(
    source.subscribe,
    source.snapshot,
    () => enabled && !!host?.snapshot().reduceMotion,
  );
}

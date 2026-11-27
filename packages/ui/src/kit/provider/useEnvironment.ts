import { useEffect, useMemo, useState } from "react";
import { defaultEnvironment, type Environment, type NativeHost } from "./environment";
import { useReducedMotion } from "./useReducedMotion";
function browserSnapshot() {
  if (typeof document === "undefined") return defaultEnvironment;
  const probe = document.createElement("div");
  probe.style.cssText = [
    "position:fixed",
    "visibility:hidden",
    "padding-top:env(safe-area-inset-top)",
    "padding-right:env(safe-area-inset-right)",
    "padding-bottom:env(safe-area-inset-bottom)",
    "padding-left:env(safe-area-inset-left)",
  ].join(";");
  document.body.appendChild(probe);
  const css = getComputedStyle(probe);
  const insets = {
    top: parseFloat(css.paddingTop) || 0,
    right: parseFloat(css.paddingRight) || 0,
    bottom: parseFloat(css.paddingBottom) || 0,
    left: parseFloat(css.paddingLeft) || 0,
  };
  probe.remove();
  return {
    ...defaultEnvironment,
    insets,
    keyboardHeight: Math.max(
      0,
      window.innerHeight -
        (window.visualViewport?.height ?? window.innerHeight) -
        (window.visualViewport?.offsetTop ?? 0),
    ),
  };
}
/** Browser viewport/accessibility data or the native host's subscribed snapshot. */
export function useEnvironment(
  nativeHost: NativeHost | undefined,
  overrides: {
    reduceMotion?: boolean | undefined;
    agentMode?: boolean | undefined;
    signature?: string | undefined;
    cue?: number | undefined;
  },
): Environment {
  const [device, setDevice] = useState(() => nativeHost?.snapshot() ?? defaultEnvironment);
  const reduced = useReducedMotion(true, nativeHost);
  useEffect(() => {
    let frame: number | undefined;
    const update = () => {
      setDevice(nativeHost?.snapshot() ?? browserSnapshot());
    };
    update();
    if (nativeHost) return nativeHost.subscribe(update);
    if (typeof window === "undefined") return;
    const resize = () => {
      update();
      const field = document.activeElement;
      if (!(field instanceof HTMLElement) || !field.matches("input, textarea")) return;
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (document.activeElement === field) field.scrollIntoView({ block: "nearest" });
      });
    };
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
    };
  }, [nativeHost]);
  return useMemo(
    () => ({
      ...device,
      reduceMotion: overrides.reduceMotion === true || reduced,
      agentMode: overrides.agentMode ?? false,
      ...(overrides.signature ? { signature: overrides.signature } : {}),
      ...(overrides.cue === undefined ? {} : { cue: overrides.cue }),
    }),
    [device, reduced, overrides.reduceMotion, overrides.agentMode, overrides.signature, overrides.cue],
  );
}

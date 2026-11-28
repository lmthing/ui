import { useEffect, useMemo, useState } from "react";
import { defaultEnvironment, type Environment, type NativeHost } from "./environment";
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
    reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
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
  const [device, setDevice] = useState(
    () =>
      nativeHost?.snapshot() ??
      (typeof window === "undefined"
        ? defaultEnvironment
        : {
            ...defaultEnvironment,
            reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          }),
  );
  useEffect(() => {
    const update = () => {
      setDevice(nativeHost?.snapshot() ?? browserSnapshot());
      if (typeof document !== "undefined" && /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName ?? ""))
        requestAnimationFrame(() =>
          (document.activeElement as HTMLElement | null)?.scrollIntoView({ block: "nearest" }),
        );
    };
    update();
    if (nativeHost) return nativeHost.subscribe(update);
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    media.addEventListener("change", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      media.removeEventListener("change", update);
    };
  }, [nativeHost]);
  return useMemo(
    () => ({
      ...device,
      reduceMotion: device.reduceMotion || overrides.reduceMotion === true,
      agentMode: overrides.agentMode ?? false,
      ...(overrides.signature ? { signature: overrides.signature } : {}),
      ...(overrides.cue === undefined ? {} : { cue: overrides.cue }),
    }),
    [device, overrides.reduceMotion, overrides.agentMode, overrides.signature, overrides.cue],
  );
}

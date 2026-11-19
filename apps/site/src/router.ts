import { useEffect, useState } from "react";

export type Route =
  | { name: "home" }
  | { name: "components" }
  | { name: "component"; id: string }
  | { name: "pack"; id: string }
  | { name: "missing"; path: string };

export function parseRoute(hash: string): Route {
  if (hash === "#/components") return { name: "components" };
  const match = /^#\/(c|p)\/([A-Za-z0-9_]+)/.exec(hash);
  if (match) return match[1] === "c" ? { name: "component", id: match[2]! } : { name: "pack", id: match[2]! };
  if (hash.startsWith("#/") && hash !== "#/") return { name: "missing", path: hash.slice(1) };
  return { name: "home" };
}

export const hrefOf = (kind: "c" | "p", id: string) => `#/${kind}/${id}`;

/** A hash router: `#/c/List`, `#/p/booking`, anything else is the home page (and its `#section` anchors). */
export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const onChange = () => {
      const next = parseRoute(location.hash);
      setRoute((now) => (JSON.stringify(now) === JSON.stringify(next) ? now : next));
      if (next.name !== "home") scrollTo(0, 0);
    };
    addEventListener("hashchange", onChange);
    return () => removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

/**
 * Scrolls a section hash (`#try`, `#packs`) into view. The browser's own anchor scroll is lost when the page's
 * HTML is replaced by the live app, and when a link from another route lands on content that is not drawn yet.
 * Routes (`#/c/...`, `#/p/...`) are untouched. The header offset comes from `scroll-padding-top`.
 */
export function useHashScroll(routeName: string): void {
  useEffect(() => {
    if (routeName !== "home") return;
    const go = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      // "instant" ignores the page's `scroll-behavior: smooth`, which a layout shift would interrupt half way.
      if (id && !id.startsWith("/"))
        document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" });
    };
    // Keep the section in place while lazy parts above it take their final size, until the visitor scrolls.
    let touched = false;
    const stop = () => (touched = true);
    const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    events.forEach((e) => addEventListener(e, stop, { passive: true, once: true }));
    const resize = new ResizeObserver(() => touched || go());
    resize.observe(document.body);
    const frame = requestAnimationFrame(go);
    const done = setTimeout(() => resize.disconnect(), 4000);
    addEventListener("hashchange", go);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(done);
      resize.disconnect();
      events.forEach((e) => removeEventListener(e, stop));
      removeEventListener("hashchange", go);
    };
  }, [routeName]);
}

import { useEffect } from "react";
import type { Route } from "../router";

/** The Markdown twin of a route. Hash routes cannot serve other content, so each twin is a static file. */
export const markdownOf = (route: Route): string | null => {
  if (route.name === "component") return `c/${route.id}.md`;
  if (route.name === "pack") return `p/${route.id}.md`;
  return route.name === "missing" ? null : "index.md";
};

/** Keeps the page's `<link rel="alternate" type="text/markdown">` pointing at the current route's twin. */
export function useAlternate(route: Route): void {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>("link[data-md]");
    const href = markdownOf(route);
    if (!link) return;
    if (href) link.setAttribute("href", href);
    else link.removeAttribute("href");
  }, [route]);
}

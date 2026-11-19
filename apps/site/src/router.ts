import { useEffect, useState } from "react";

export type Route = { name: "home" } | { name: "component"; id: string } | { name: "pack"; id: string };

export function parseRoute(hash: string): Route {
  const match = /^#\/(c|p)\/([A-Za-z0-9_]+)/.exec(hash);
  if (match) return match[1] === "c" ? { name: "component", id: match[2]! } : { name: "pack", id: match[2]! };
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

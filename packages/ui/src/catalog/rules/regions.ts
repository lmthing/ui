import type { Definition } from "../probes";
import type { ScreenEntry } from "./types";
import { resolveDefinition } from "./types";
const order = { top: 0, body: 1, bottom: 2, overlay: 3 } as const;
/** Stable within a region; host-owned tabs follow the bottom action. */
export function sortByRegion<T extends ScreenEntry>(
  entries: readonly T[],
  defs: Record<string, Definition>,
): T[] {
  return entries
    .map((entry, index) => ({ entry, index, meta: resolveDefinition(defs, entry.c)?.meta }))
    .sort(
      (a, b) =>
        order[a.meta?.region ?? "body"] - order[b.meta?.region ?? "body"] ||
        (a.meta?.region === "bottom" ? Number(a.entry.c === "TabBar") - Number(b.entry.c === "TabBar") : 0) ||
        a.index - b.index,
    )
    .map(({ entry }) => entry);
}

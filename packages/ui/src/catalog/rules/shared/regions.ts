import type { Definition } from "../../probes";
import type { ScreenEntry } from "./types";
import { resolveDefinition } from "./types";
const order = { top: 0, body: 1, bottom: 2, overlay: 3 } as const;

export function regionOf(entry: ScreenEntry, defs: Record<string, Definition>): keyof typeof order {
  const region = resolveDefinition(defs, entry.c)?.meta.region ?? "body";
  return entry.c === "Button" && entry.emphasis === "quiet" ? "body" : region;
}

/** Stable within a region; host-owned tabs follow the bottom action. */
export function sortByRegion<T extends ScreenEntry>(
  entries: readonly T[],
  defs: Record<string, Definition>,
): T[] {
  return entries
    .map((entry, index) => ({ entry, index, region: regionOf(entry, defs) }))
    .sort(
      (a, b) =>
        order[a.region] - order[b.region] ||
        (a.region === "bottom" ? Number(a.entry.c === "TabBar") - Number(b.entry.c === "TabBar") : 0) ||
        a.index - b.index,
    )
    .map(({ entry }) => entry);
}

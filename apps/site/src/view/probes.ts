import { components, readScreen, type ScreenLike } from "@lmthing/ui/catalog";
import { site } from "../data/site";
import type { ReadProbe } from "../../scripts/site-types";

export type Matched = { probe: ReadProbe; screen: ScreenLike };

type Defs = Record<string, { examples: unknown[] }>;

/**
 * Rebuilds each recorded read probe's screen from the component's own examples. A probe is kept only
 * when the catalog's `readScreen` reproduces the exact text the model was shown.
 */
export function matchedProbes(limit = 8): Matched[] {
  const defs = components as unknown as Defs;
  const seen = new Set<string>();
  const out: Matched[] = [];
  for (const probe of site.readProbes) {
    const key = `${probe.text}|${probe.task}`;
    const head = /^screen (\S+)\n(\w+) (\w+)/.exec(probe.text);
    if (!head || seen.has(key)) continue;
    const [, screenId, id, c] = head;
    for (const example of defs[c!]?.examples ?? []) {
      const screen = {
        id: screenId!,
        components: [{ id: id!, c: c!, ...(example as object) }],
      } as ScreenLike;
      if (readScreen(screen, components as never) === probe.text) {
        seen.add(key);
        out.push({ probe, screen });
        break;
      }
    }
    if (out.length >= limit) break;
  }
  return out;
}

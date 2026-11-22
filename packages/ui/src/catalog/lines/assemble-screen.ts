import type { ScreenLike } from "../agent";
import type { LineCode } from "./codes";
import { parseLine } from "./parse-line";
import {
  repairComponent,
  type LineRegistry,
  type PendingComponent,
  type RepairContext,
} from "./repair-component";
import { stampIdsWithCounters, type IdCounters, type StampResult } from "./stamp-ids";

export type AssembleContext = RepairContext & { id?: string; title?: string; counters?: IdCounters };
export type AssembledScreen = ScreenLike & Pick<StampResult, "counters" | "itemIds">;

/** Parse, repair, and stamp in input order. Region, app, and rewrite repairs belong to the host. */
export function assembleScreen(
  lines: Iterable<string>,
  registry: LineRegistry,
  ctx: AssembleContext,
): { screen: AssembledScreen; codes: LineCode[] } {
  const codes: LineCode[] = [],
    components: PendingComponent[] = [];
  for (const text of lines) {
    if (!text.trim()) continue;
    const parsed = parseLine(text);
    codes.push(...parsed.codes);
    if (!Object.hasOwn(parsed, "line")) continue;
    const repaired = repairComponent(parsed.line, registry, ctx);
    codes.push(...repaired.codes);
    if (repaired.component) components.push(repaired.component);
  }
  const { id = "screen", title, counters } = ctx;
  const screen = {
    id,
    ...(title === undefined ? {} : { title }),
    ...stampIdsWithCounters(components, registry, counters),
  };
  return { screen, codes };
}

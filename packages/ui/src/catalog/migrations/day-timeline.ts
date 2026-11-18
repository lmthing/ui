import type { ScreenLike } from "../agent";
import { legacyTarget } from "./aliases";
/** Preserve component ids, state, links, tones and time ordering while migrating the retired shape. */
export function migrateLine<T extends Record<string, unknown>>(
  line: T,
): T | (Record<string, unknown> & { c: string }) {
  if (legacyTarget(String(line.c)) !== "Timeline" || !Array.isArray(line.blocks)) return line;
  const { blocks, c: _c, ...rest } = line;
  return {
    ...rest,
    c: "Timeline",
    style: "hours",
    items: (blocks as Record<string, unknown>[]).map(({ start, end, root: _root, ...item }) => ({
      ...item,
      time: start,
      end,
    })),
  };
}
export function migrateScreen(screen: ScreenLike): ScreenLike {
  return {
    ...screen,
    components: screen.components.map((entry) => migrateLine(entry) as ScreenLike["components"][number]),
  };
}
export function migrateJSONL(lines: string): string {
  return lines
    .split(/\r?\n/)
    .map((line) => {
      if (!line.trim()) return line;
      const value = JSON.parse(line) as Record<string, unknown>;
      return JSON.stringify(
        Array.isArray(value.components) ? migrateScreen(value as ScreenLike) : migrateLine(value),
      );
    })
    .join("\n");
}

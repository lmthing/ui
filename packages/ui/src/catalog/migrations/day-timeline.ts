import type { ScreenLike } from "../agent";
import { legacyTarget } from "./aliases";
import { migrateVariantProps, variantMoves } from "./variant-line";

export type MigrationOptions = { variantComponents?: readonly string[] };
// Enable each staged migration here in the same change that adopts the component schema.
const adoptedVariants: readonly string[] = [];
/** Preserve component ids, state, links, tones and time ordering while migrating the retired shape. */
export function migrateLine<T extends Record<string, unknown>>(
  line: T,
  { variantComponents = adoptedVariants }: MigrationOptions = {},
): T | (Record<string, unknown> & { c: string }) {
  if (
    typeof line.c === "string" &&
    variantComponents.includes(line.c) &&
    Object.hasOwn(variantMoves, line.c)
  ) {
    const { c, ...props } = line;
    const migrated = migrateVariantProps(props, variantMoves[c] ?? []);
    if (migrated !== props) return { ...migrated, c };
  }
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
export function migrateScreen(screen: ScreenLike, options?: MigrationOptions): ScreenLike {
  return {
    ...screen,
    components: screen.components.map(
      (entry) => migrateLine(entry, options) as ScreenLike["components"][number],
    ),
  };
}
export function migrateJSONL(lines: string, options?: MigrationOptions): string {
  return lines
    .split(/\r?\n/)
    .map((line) => {
      if (!line.trim()) return line;
      const value = JSON.parse(line) as Record<string, unknown>;
      return JSON.stringify(
        Array.isArray(value.components)
          ? migrateScreen(value as ScreenLike, options)
          : migrateLine(value, options),
      );
    })
    .join("\n");
}

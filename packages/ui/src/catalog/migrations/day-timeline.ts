import type { ScreenLike } from "../agent";
import { legacyTarget, normalizeComponentId } from "./aliases";
import { effectiveLegacyList, migrateVariantProps, variantMoves } from "./variant-line";

export type MigrationOptions = { variantComponents?: readonly string[] };
// Enable each staged migration here in the same change that adopts the component schema.
const adoptedVariants: readonly string[] = [];
/** Preserve component ids, state, links, tones and time ordering while migrating the retired shape. */
export function migrateLine<T extends Record<string, unknown>>(
  line: T,
  { variantComponents = adoptedVariants }: MigrationOptions = {},
): T | (Record<string, unknown> & { c: string }) {
  const { c: name, ...props } = line;
  const c =
    typeof name === "string"
      ? variantComponents.find((id) => normalizeComponentId(id) === normalizeComponentId(name))
      : undefined;
  if (c && Object.hasOwn(variantMoves, c)) {
    const source = c === "List" ? effectiveLegacyList(props) : props;
    const migrated = migrateVariantProps(source, variantMoves[c] ?? []);
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

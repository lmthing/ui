import type { ScreenLike } from "../agent";
import { legacyTarget, normalizeComponentId } from "./aliases";
import {
  effectiveLegacyList,
  migrateProgressItems,
  migrateSheetItems,
  migrateVariantProps,
  variantMoves,
} from "./variant-line";

export type MigrationOptions = {
  variantComponents?: readonly string[];
  /** Only apply prop moves; do not admit retired component IDs into the caller's scope. */
  variantOnly?: boolean;
};
// Enable each staged migration here in the same change that adopts the component schema.
const adoptedVariants: readonly string[] = [
  "List",
  "Card",
  "People",
  "Gallery",
  "Stats",
  "KeyValue",
  "Slots",
  "ServiceMenu",
  "Devices",
  "Loan",
  "Payoff",
  "Hero",
  "Header",
  "Note",
  "Photo",
  "Profile",
  "Sheet",
  "Amount",
  "Ring",
  "Progress",
];
const isBlock = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/** Preserve component ids, state, links, tones and time ordering while migrating the retired shape. */
export function migrateLine<T extends Record<string, unknown>>(
  line: T,
  { variantComponents = adoptedVariants, variantOnly = false }: MigrationOptions = {},
): T | (Record<string, unknown> & { c: string }) {
  const { c: name, ...props } = line;
  const c =
    typeof name === "string"
      ? variantComponents.find((id) => normalizeComponentId(id) === normalizeComponentId(name))
      : undefined;
  if (c && Object.hasOwn(variantMoves, c)) {
    const prepare = { List: effectiveLegacyList, Sheet: migrateSheetItems, Progress: migrateProgressItems };
    const source = prepare[c as keyof typeof prepare]?.(props) ?? props;
    const migrated = migrateVariantProps(source, variantMoves[c] ?? []);
    if (migrated !== props || c !== name) return { ...migrated, c };
  }
  if (
    variantOnly ||
    legacyTarget(String(line.c)) !== "Timeline" ||
    !Array.isArray(line.blocks) ||
    !line.blocks.every(isBlock)
  )
    return line;
  const { blocks, c: _c, ...rest } = line;
  return {
    ...rest,
    c: "Timeline",
    style: "hours",
    items: blocks.map(({ start, end, root: _root, ...item }) => ({
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

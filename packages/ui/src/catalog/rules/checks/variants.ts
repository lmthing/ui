import type { ScreenLike } from "../../agent";
import type { Definition } from "../../probes";
import { at, resolveDefinition, type Issue, type RowAddress, type ScreenEntry } from "../shared";

function hasValue(values: readonly string[] | undefined, input: unknown, value: string): boolean {
  return Boolean(values?.includes(value) && (input === undefined ? values[0] : input) === value);
}

function checkHighlights(
  screen: ScreenLike,
  entry: ScreenEntry,
  meta: Definition["meta"],
  rowAddress?: RowAddress,
): Issue[] {
  const items = meta.items;
  const rows = items && entry[items.key];
  if (!items?.variants?.mark?.includes("highlight") || !Array.isArray(rows)) return [];
  const limit = Math.floor(rows.length / 3);
  let highlights = 0;
  return rows.flatMap((row: unknown, index) => {
    if (
      !row ||
      typeof row !== "object" ||
      Array.isArray(row) ||
      !hasValue(items.variants?.mark, (row as Record<string, unknown>).mark, "highlight") ||
      ++highlights <= limit
    )
      return [];
    return [
      {
        code: "S.highlight_over",
        address:
          rowAddress?.(entry, items.key, index) ??
          `${screen.id}/${entry.id}/${items.prefix ?? "r"}${index + 1}/root`,
        message: "At most one third of this component's items may be highlighted",
      },
    ];
  });
}

export function checkVariants(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  rowAddress?: RowAddress,
): Issue[] {
  const issues: Issue[] = [];
  let heroes = 0;
  let covers = 0;
  for (const entry of screen.components) {
    const meta = resolveDefinition(defs, entry.c)?.meta;
    if (!meta) continue;
    if (hasValue(meta.variants?.emphasis, entry.emphasis, "hero") && ++heroes > 1)
      issues.push({
        code: "S.hero_over",
        address: at(screen, entry),
        message: "At most one hero emphasis is allowed",
      });
    if (meta.items && hasValue(meta.variants?.media, entry.media, "cover") && ++covers > 1)
      issues.push({
        code: "S.cover_over",
        address: at(screen, entry),
        message: "At most one cover collection is allowed",
      });
    issues.push(...checkHighlights(screen, entry, meta, rowAddress));
  }
  return issues;
}

import type { ScreenLike } from "../../agent";
import type { Issue, RowAddress, ScreenEntry } from "../shared";
const placeholder = /\blorem(?: ipsum)?\b|^\s*(?:item\s*\d+|john doe|untitled|example(?:\s*\d+)?)\s*$/i;
export function checkPlaceholders(screen: ScreenLike, rowAddress?: RowAddress): Issue[] {
  const issues: Issue[] = [];
  function visit(entry: ScreenEntry, value: unknown, path: readonly (string | number)[]) {
    if (typeof value === "string" && placeholder.test(value)) {
      const [key, index, part] = path;
      const row =
        typeof key === "string" && typeof index === "number"
          ? rowAddress?.(entry, key, index, part)
          : undefined;
      const fields = path.map((segment) => (typeof segment === "number" ? `r${segment + 1}` : segment));
      issues.push({
        code: "S.placeholder",
        address: row ?? `${screen.id}/${entry.id}/${fields.join("/")}`,
        message: "Replace unfinished placeholder copy",
      });
    } else if (Array.isArray(value)) value.forEach((item, index) => visit(entry, item, [...path, index]));
    else if (value && typeof value === "object")
      for (const [key, item] of Object.entries(value)) visit(entry, item, [...path, key]);
  }
  for (const entry of screen.components) {
    const { id: _id, c: _c, state: _state, ...input } = entry;
    visit(entry, input, []);
  }
  return issues;
}

import type { ScreenLike } from "../../agent";
import type { Issue } from "../shared";
const placeholder = /\blorem(?: ipsum)?\b|^\s*(?:item\s*\d+|john doe|untitled|example(?:\s*\d+)?)\s*$/i;
export function checkPlaceholders(screen: ScreenLike): Issue[] {
  const issues: Issue[] = [];
  function visit(value: unknown, address: string) {
    if (typeof value === "string" && placeholder.test(value))
      issues.push({ code: "S.placeholder", address, message: "Replace unfinished placeholder copy" });
    else if (Array.isArray(value)) value.forEach((item, index) => visit(item, `${address}/r${index + 1}`));
    else if (value && typeof value === "object")
      for (const [key, item] of Object.entries(value)) visit(item, `${address}/${key}`);
  }
  for (const { id, c: _c, state: _state, ...input } of screen.components) visit(input, `${screen.id}/${id}`);
  return issues;
}

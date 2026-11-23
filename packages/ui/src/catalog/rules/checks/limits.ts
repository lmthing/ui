import { z } from "zod";
import type { ScreenLike } from "../../agent";
import type { Definition } from "../../probes";
import { at, resolveDefinition, type Issue, type RowAddress } from "../shared";
export function checkLimits(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  rowAddress?: RowAddress,
): Issue[] {
  const seen = new Set<string>();
  return screen.components.flatMap((entry) => {
    const issues: Issue[] = [];
    if (seen.has(entry.id))
      issues.push({
        code: "S.duplicate_id",
        address: at(screen, entry),
        message: "Component ids must be unique",
      });
    seen.add(entry.id);
    const def = resolveDefinition(defs, entry.c);
    if (!def)
      return [
        ...issues,
        { code: "S.unknown_component", address: at(screen, entry), message: `Unknown component ${entry.c}` },
      ];
    const { id: _id, c: _c, state, ...input } = entry;
    const parsed = def.props.safeParse(input);
    if (!parsed.success)
      for (const issue of parsed.error.issues) {
        const [key, index, part] = issue.path;
        const row =
          typeof key === "string" && typeof index === "number"
            ? rowAddress?.(entry, key, index, part)
            : undefined;
        issues.push({
          code: "S.props",
          address: row ?? `${screen.id}/${entry.id}/${issue.path.join("/") || "root"}`,
          message: issue.message,
        });
      }
    if (state && !(def.meta.states ?? ["filled"]).includes(state))
      issues.push({
        code: "S.state",
        address: at(screen, entry),
        message: `${def.meta.id} does not declare ${state}`,
      });
    return issues;
  });
}

export function limitAt(
  def: Definition,
  path: readonly string[],
  limit: "maxLength" | "maxItems" = "maxLength",
): number | undefined {
  let node = z.toJSONSchema(def.props, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
  for (const key of path) {
    const next = key === "*" ? node.items : (node.properties as Record<string, unknown> | undefined)?.[key];
    if (!next || typeof next !== "object") return undefined;
    node = next as Record<string, unknown>;
  }
  return typeof node[limit] === "number" ? (node[limit] as number) : undefined;
}

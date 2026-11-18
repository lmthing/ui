import type { ScreenLike } from "../agent";
import type { Definition } from "../probes";
import { at, resolveDefinition, type Issue } from "./types";
export function checkWeight(screen: ScreenLike, defs: Record<string, Definition>): Issue[] {
  const entries = screen.components.filter(
    (entry) => resolveDefinition(defs, entry.c)?.meta.region !== "overlay",
  );
  const weights = entries.map((entry) => {
    const meta = resolveDefinition(defs, entry.c)?.meta;
    return meta?.weightByStyle?.[String(entry.style)] ?? meta?.weight ?? 0;
  });
  const issues: Issue[] = [];
  if (entries.length < 3 || entries.length > 9)
    issues.push({
      code: "S.component_count",
      address: at(screen),
      message: "A screen takes three to nine components outside overlays",
    });
  if (weights.reduce<number>((sum, weight) => sum + weight, 0) > 12)
    issues.push({ code: "S.weight_over", address: at(screen), message: "Screen weight exceeds twelve" });
  if (weights.filter((weight) => weight === 3).length > 2)
    issues.push({
      code: "S.heavy_over",
      address: at(screen),
      message: "At most two components may have weight three",
    });
  return issues;
}

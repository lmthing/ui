import type { ScreenLike } from "../agent";
import type { Definition } from "../probes";
import { sortByRegion } from "./regions";
import { at, resolveDefinition, type Issue } from "./types";
export function checkNeighbours(screen: ScreenLike, defs: Record<string, Definition>): Issue[] {
  const entries = sortByRegion(screen.components, defs);
  const body = entries.filter((entry) => resolveDefinition(defs, entry.c)?.meta.region === "body");
  const issues: Issue[] = [];
  const primaries = entries.filter(
    (entry) => entry.c === "Button" && (entry.kind ?? "primary") === "primary",
  );
  if (primaries.length > 1)
    issues.push({
      code: "S.two_primaries",
      address: at(screen, primaries[1]),
      message: "At most one primary Button is allowed",
    });
  if (entries[0]?.c === "Button")
    issues.push({
      code: "S.button_first",
      address: at(screen, entries[0]),
      message: "A Button cannot be the first component",
    });
  for (const [index, entry] of body.entries()) {
    if (entry.c === "Hero" && index !== 0)
      issues.push({
        code: "S.hero_first",
        address: at(screen, entry),
        message: "Hero must be first in the body",
      });
    if (entry.c === "SectionTitle" && (!body[index + 1] || body[index + 1]!.c === "SectionTitle"))
      issues.push({
        code: "S.empty_section",
        address: at(screen, entry),
        message: "A section title needs content after it",
      });
    if (index && body[index - 1]!.c === entry.c && !["Card", "Field"].includes(entry.c))
      issues.push({
        code: "S.adjacent",
        address: at(screen, entry),
        message: "Repeated types cannot be adjacent except Card and Field",
      });
  }
  return issues;
}

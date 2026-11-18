import type { ScreenLike } from "../agent";
import { checkWeight } from "./weight";
import { checkLimits } from "./limits";
import { checkNeighbours } from "./neighbours";
import { checkPlaceholders } from "./placeholders";
import { checkCore } from "./core";
import { definitionsOf, resolveDefinition, type RegistryLike, type Issue } from "./types";
/** Reports stable issues and leaves the caller's screen untouched. */
export function checkScreen(
  screen: ScreenLike,
  registry: RegistryLike,
  options: { flowOpensSheet?: boolean } = {},
): Issue[] {
  const defs = definitionsOf(registry);
  const canonical = {
    ...screen,
    components: screen.components.map((entry) => ({
      ...entry,
      c: resolveDefinition(defs, entry.c)?.meta.id ?? entry.c,
    })),
  };
  return [
    ...checkLimits(canonical, defs),
    ...checkWeight(canonical, defs),
    ...checkNeighbours(canonical, defs),
    ...checkCore(canonical, defs, options.flowOpensSheet),
    ...checkPlaceholders(canonical),
  ];
}

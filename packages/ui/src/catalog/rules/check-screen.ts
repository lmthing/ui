import {
  checkWeight,
  checkLimits,
  checkNeighbours,
  checkPlaceholders,
  checkCore,
  checkVariants,
} from "./checks";
import type { ScreenLike } from "../agent";
import { migrateScreen } from "../migrations";
import { definitionsOf, resolveDefinition, type RegistryLike, type Issue } from "./shared";
/** Reports stable issues and leaves the caller's screen untouched. */
export function checkScreen(
  screen: ScreenLike,
  registry: RegistryLike,
  options: { flowOpensSheet?: boolean } = {},
): Issue[] {
  const defs = definitionsOf(registry);
  const canonical = {
    ...screen,
    components: migrateScreen(screen, { variantOnly: true }).components.map((entry) => ({
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
    ...checkVariants(canonical, defs),
  ];
}

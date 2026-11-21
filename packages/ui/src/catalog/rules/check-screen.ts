import {
  checkWeight,
  checkLimits,
  checkNeighbours,
  checkPlaceholders,
  checkCore,
  checkVariants,
} from "./checks";
import type { ScreenLike } from "../agent";
import type { PackId, PackMeta } from "../meta";
import { migrateScreen } from "../migrations";
import type { Definition } from "../probes";
import { definitionsOf, resolveDefinition, type RegistryLike, type Issue } from "./shared";

export type PackScreenContext = {
  packOf: Readonly<Partial<Record<string, PackId>>>;
  packs: Readonly<Partial<Record<PackId, PackMeta>>>;
};

/** Run each owning pack's checks once, in first appearance order. */
function checkPackScreen(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  { packOf, packs }: PackScreenContext,
): Issue[] {
  const used = new Set(screen.components.map(({ c }) => packOf[c]));
  const validators = [...used].flatMap((id) => (id ? (packs[id]?.screenValidators ?? []) : []));
  if (!validators.length) return [];
  // The limits check already verified these inputs. Only pack checks need their parsed values.
  const parsed = {
    ...screen,
    components: screen.components.map(({ id, c, state, ...input }) => ({
      ...resolveDefinition(defs, c)!.props.parse(input),
      id,
      c,
      ...(state === undefined ? {} : { state }),
    })),
  };
  return validators.flatMap((validate) => validate(parsed));
}

/** Reports stable issues and leaves the caller's screen untouched. */
export function checkScreen(
  screen: ScreenLike,
  registry: RegistryLike,
  options: { flowOpensSheet?: boolean; packContext?: PackScreenContext } = {},
): Issue[] {
  const defs = definitionsOf(registry);
  const canonical = {
    ...screen,
    components: migrateScreen(screen, { variantOnly: true }).components.map((entry) => ({
      ...entry,
      c: resolveDefinition(defs, entry.c)?.meta.id ?? entry.c,
    })),
  };
  const limits = checkLimits(canonical, defs);
  return [
    ...limits,
    ...checkWeight(canonical, defs),
    ...checkNeighbours(canonical, defs),
    ...checkCore(canonical, defs, options.flowOpensSheet),
    ...checkPlaceholders(canonical),
    ...checkVariants(canonical, defs),
    ...(options.packContext && !limits.length ? checkPackScreen(canonical, defs, options.packContext) : []),
  ];
}

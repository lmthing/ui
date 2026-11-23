import { components as definitions } from "./definitions";
import { packOf, packs as packDefinitions } from "./packs";
import type { PackId, PackMeta, Definition } from "../catalog/runtime";
import type { RegistryOptions } from "../catalog/registry";
import { componentRegistryOf } from "../catalog/registry/components";

export * from "../catalog/runtime";
export { packOf };
export const packs: Readonly<Partial<Record<PackId, PackMeta>>> = packDefinitions;
export type ComponentName = keyof typeof definitions;

// The build replaces this with the list accepted by the full catalog's pack gate.
declare const READY_PACKS: readonly PackId[];
const ready = new Set(READY_PACKS);

export const components: {
  [Name in ComponentName]: Omit<Definition, "props" | "fallback"> &
    Pick<(typeof definitions)[Name], "props" | "fallback">;
} = definitions;

export function packReady(id: PackId) {
  return ready.has(id);
}

export function createRegistry(
  options: RegistryOptions = {},
): ReturnType<typeof componentRegistryOf<typeof components>> {
  const selected = new Set(options.packs?.filter((pack) => options.includeDrafts || packReady(pack)));
  return componentRegistryOf(components, packOf, selected, options.includeDrafts);
}

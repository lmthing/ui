import type { PackId } from "./pack-ids";
import { originalPacks, personalPacks, expansionPacks } from "./pack-index-data";

export type PackIndexEntry = { id: PackId; name: string; purpose: string; pick: string };

// A pack id can be registered before it is offered to the Director.
export const packIndex = [
  ...originalPacks,
  ...personalPacks,
  ...expansionPacks,
] as const satisfies readonly PackIndexEntry[];

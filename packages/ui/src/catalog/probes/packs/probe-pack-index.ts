import { packIds, type PackId, type PackMeta } from "../../meta";
import { buildPackIndex } from "../../prompt";

/** All planned choices stay fixed as neighbouring packs gain scaffolds. */
export function probePackIndex(packs: Partial<Record<PackId, PackMeta>>) {
  return {
    ids: [...packIds],
    prompt: buildPackIndex(packs, { includeDrafts: true }),
  };
}

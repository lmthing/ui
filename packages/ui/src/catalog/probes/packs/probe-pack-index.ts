import { packIndex, type PackId, type PackMeta } from "../../meta";
import { buildPackIndex } from "../../prompt";

/** Score only the choices the Director sees, even as more pack ids are registered. */
export function probePackIndex(packs: Partial<Record<PackId, PackMeta>>) {
  return {
    ids: packIndex.map(({ id }) => id),
    prompt: buildPackIndex(packs, { includeDrafts: true }),
  };
}

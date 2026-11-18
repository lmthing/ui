import type { PackId, PackMeta } from "../meta";

/** The Director's pack choices, ordered by id independently of map insertion order. */
export function buildPackIndex(
  packs: Partial<Record<PackId, PackMeta>>,
  options: { includeDrafts?: boolean } = {},
  isPackReady: (id: PackId) => boolean = () => false,
): string {
  return Object.values(packs)
    .filter((pack) => options.includeDrafts || isPackReady(pack.id))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((pack) => `- ${pack.id}: ${pack.purpose} Pick: ${pack.pick}`)
    .join("\n");
}

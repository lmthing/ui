import { packIds, type PackId, type PackMeta } from "../../meta";
import { buildPackIndex } from "../../prompt";

/** Probe the named near-miss boundary before its neighbouring pack has a scaffold. */
export function probePackIndex(packs: Partial<Record<PackId, PackMeta>>) {
  const boundaries = new Map<PackId, string>();
  for (const pack of Object.values(packs))
    for (const match of pack.pick.matchAll(/Not ([^.()]+)\(([a-z]+)\)/g)) {
      const id = match[2] as PackId;
      if (packIds.includes(id) && !packs[id]) boundaries.set(id, match[1]!.trim());
    }
  return {
    ids: [...Object.keys(packs), ...boundaries.keys()],
    prompt: [
      buildPackIndex(packs, { includeDrafts: true }),
      ...[...boundaries].map(([id, purpose]) => `- ${id}: ${purpose} (named neighbouring pack boundary)`),
    ].join("\n"),
  };
}

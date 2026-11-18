// What the static gallery lists: every component in the core and every pack, drafts included.
import type * as Catalog from "@lmthing/ui/catalog";

// The built catalog, as the llm scripts load it (the source entry pulls in React Native under tsx).
const { createRegistry, packIds } = (await import(
  new URL("../../../dist/catalog.js", import.meta.url).href
)) as typeof Catalog;

export type GalleryEntry = {
  id: string;
  group: string;
  tier: string;
  purpose: string;
  status: string;
  pack: string | null;
};

type MetaLike = { id: string; group: string; tier: string; purpose: string; status?: string };

export function galleryEntries(): GalleryEntry[] {
  const registry = createRegistry({ includeDrafts: true, packs: packIds });
  return registry.defs.map((def) => {
    const meta = def.meta as MetaLike;
    const pack = (registry.packOf as Record<string, string | undefined>)[meta.id] ?? null;
    return {
      id: meta.id,
      group: meta.group,
      tier: meta.tier,
      purpose: meta.purpose,
      status: meta.status ?? "ready",
      pack,
    };
  });
}

/** The component's source file, used to tell which components changed since the last export. */
export function sourceOf(entry: GalleryEntry): string {
  return entry.pack ? `src/packs/${entry.pack}/components/${entry.id}.tsx` : `src/components/${entry.id}.tsx`;
}

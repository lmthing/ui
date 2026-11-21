import type * as Catalog from "@lmthing/ui/catalog";
import type { ProbeCall, PackId } from "@lmthing/ui/catalog";

const { createRegistry, packs, packOf, packComposeProbes, runProbes, runPackProbes, runComposeProbes } =
  (await import(new URL("../../../dist/catalog.js", import.meta.url).href)) as typeof Catalog;

/** Every layout and every component uses core plus its own pack, including drafts. */
export async function packProbes(id: PackId, callModel: ProbeCall, samples: number) {
  if (!(id in packs)) throw new Error(`Unknown pack: ${id}`);
  const registry = createRegistry({ packs: [id], includeDrafts: true });
  const chosen = registry.ids.filter((name) => (packOf as Record<string, string>)[name] === id);
  const core = (packs as Partial<Record<PackId, Catalog.PackMeta>>)[id]!.probes.filter(
    (probe) => probe.kind === "choose",
  );
  const results = [
    ...(await runPackProbes({ packs, only: [id], callModel, samples })),
    ...(await runProbes({
      defs: registry.defs.map((def) => ({
        ...def,
        probes: core.filter((probe) => probe.expect === def.meta.id),
      })),
      callModel,
      samples,
    })),
    ...(await runProbes({ defs: registry.defs, only: chosen, callModel, samples })),
  ];
  const compose = await runComposeProbes({
    archetypes: registry.packComposeArchetypes,
    probes: (packComposeProbes as Partial<Record<PackId, readonly Catalog.ComposeProbe[]>>)[id] ?? [],
    defs: Object.fromEntries(registry.defs.map((def) => [def.meta.id, def])),
    cast: { things: [], items: [] },
    callModel,
    samples,
  });
  return { results, compose };
}

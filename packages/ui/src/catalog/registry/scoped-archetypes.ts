import { archetypes, type ArchetypeOverrides, type CoreArchetypeMeta } from "../archetypes";
import type { ArchetypeMeta, PackId } from "../meta";
import { packComposition } from "../probes";

type PackArchetypes = Partial<Record<PackId, readonly ArchetypeMeta[]>>;
type PackOverrides = Partial<Record<PackId, ArchetypeOverrides>>;

export function scopedArchetypes(
  selected: ReadonlySet<PackId>,
  packArchetypes: PackArchetypes,
  packOverrides: PackOverrides,
) {
  const patterns = new Map<string, { meta: CoreArchetypeMeta }>(Object.entries(archetypes));
  const packComposeArchetypes: CoreArchetypeMeta[] = [];
  const claimed = new Map<string, PackId>();
  for (const pack of selected) {
    for (const data of packArchetypes[pack] ?? []) {
      if (patterns.has(data.id)) throw new Error(`${pack}: duplicate archetype id ${data.id}`);
      const meta = packComposition(data);
      patterns.set(meta.id, { meta });
      packComposeArchetypes.push(meta);
    }
    for (const [id, layouts] of Object.entries(packOverrides[pack] ?? {})) {
      if (!Object.hasOwn(archetypes, id)) throw new Error(`${pack}: unknown core archetype ${id}`);
      for (const layout of Object.keys(layouts)) {
        const address = `${id}/${layout}`;
        const previous = claimed.get(address);
        if (previous)
          throw new Error(`${pack}: duplicate layout override ${address} (already in ${previous})`);
        claimed.set(address, pack);
      }
      const current = patterns.get(id)!.meta;
      const override = packComposition({ id, job: current.purpose, layouts });
      patterns.set(id, {
        meta: {
          ...current,
          layouts: { ...current.layouts, ...override.layouts },
          defaults: { ...current.defaults, ...override.defaults },
        },
      });
      // The pack gate owns these layouts, not the unchanged layouts of the same core archetype.
      packComposeArchetypes.push(override);
    }
  }
  return { archetypes: Object.fromEntries(patterns), packComposeArchetypes };
}

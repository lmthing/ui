import { packIds, packIndex, type PackId, type PackMeta, type ArchetypeMeta } from "../meta";
import type { Definition } from "../probes";
import { registryOf } from "../registry";
import { archetypes, type ArchetypeOverrides } from "../archetypes";
import { checkArchetypeOverrides } from "./check-archetypes";
import { denseIds } from "./dense-ids";

type Input = {
  components: Record<string, Definition>;
  packOf: Partial<Record<string, PackId>>;
  packs: Partial<Record<PackId, PackMeta>>;
  packArchetypes: Partial<Record<PackId, readonly ArchetypeMeta[]>>;
  packArchetypeOverrides?: Partial<Record<PackId, ArchetypeOverrides>>;
  packExamples: Partial<Record<PackId, string>>;
};

function checkMeta(input: Input, pack: PackMeta): string[] {
  const issues: string[] = [];
  const entry = packIndex.find(({ id }) => id === pack.id);
  const nearest = packIds.filter((id) => id !== pack.id && new RegExp(`\\b${id}\\b`).test(entry?.pick ?? ""));
  if (!entry?.purpose.trim() || !entry.pick.trim() || !nearest.length)
    issues.push(`${pack.id}: purpose/pick`);
  if ((input.packArchetypes[pack.id]?.length ?? 0) < 2) issues.push(`${pack.id}: archetypes`);
  const probes = pack.probes.filter((probe) => probe.kind === "pack");
  const positive = probes.filter((probe) => probe.expect.includes(pack.id));
  const miss = probes.some(
    (probe) => !probe.expect.includes(pack.id) && nearest.some((id) => probe.expect.includes(id)),
  );
  if (probes.length < 3 || positive.length < 2 || !miss) issues.push(`${pack.id}: probes`);
  if (probes.some((probe) => probe.expect.length > 3 || probe.expect.some((id) => !packIds.includes(id))))
    issues.push(`${pack.id}: expect`);
  if (probes.some((probe) => probe.allow?.some((id) => !packIds.includes(id))))
    issues.push(`${pack.id}: allow`);
  return issues;
}

function checkExample(input: Input, pack: PackMeta): string[] {
  const text = input.packExamples[pack.id];
  const lines = text
    ?.trim()
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (!pack.example.trim() || !lines?.length) return [`${pack.id}: example`];
  const registry = registryOf(input.components, { packs: [pack.id], includeDrafts: true }, input.packOf);
  // Until assembleScreen/readComponent exists, require each JSON line to validate without repair.
  return lines.flatMap((line, index) => {
    try {
      const { c, id: _id, ...props } = JSON.parse(line);
      const resolved = typeof c === "string" ? registry.resolve(c) : undefined;
      if (resolved && registry.schema(resolved)?.safeParse(props).success) return [];
    } catch {
      /* Invalid JSON is an invalid example line. */
    }
    return [`${pack.id}: example line ${index + 1}`];
  });
}

function checkComponents(input: Input): string[] {
  return Object.values(input.components).flatMap(({ meta }) => {
    if (!input.packOf[meta.id]) return [];
    const issues: string[] = [];
    const parts = new Set([...(meta.parts ?? ["root"]), ...(meta.items?.parts ?? [])]);
    if ([...(meta.confirmParts ?? []), ...Object.keys(meta.partTiers ?? {})].some((part) => !parts.has(part)))
      issues.push(`${meta.id}: parts`);
    if (denseIds.includes(meta.id) && !meta.dense) issues.push(`${meta.id}: dense`);
    return issues;
  });
}

function checkOwnership(input: Input): string[] {
  const issues: string[] = [];
  for (const [id, pack] of Object.entries(input.packs))
    if (!packIds.includes(id as PackId) || pack.id !== id)
      issues.push(`${id}: -/-: pack metadata belongs to ${pack.id}`);
  for (const [id, owner] of Object.entries(input.packOf)) {
    if (!owner) continue;
    if (!input.components[id] || input.components[id]!.meta.id !== id)
      issues.push(`${owner}: ${id}/-: packOf does not name a matching component`);
    if (!input.packs[owner] || input.packs[owner]!.id !== owner)
      issues.push(`${owner}: ${id}/-: packOf names an undeclared pack`);
  }
  for (const [owner, archetypes] of Object.entries(input.packArchetypes))
    if (!input.packs[owner as PackId] || input.packs[owner as PackId]!.id !== owner)
      for (const archetype of archetypes)
        issues.push(`${owner}: ${archetype.id}/-: archetype belongs to an undeclared pack`);
  for (const owner of Object.keys(input.packArchetypeOverrides ?? {}) as PackId[])
    if (!input.packs[owner] || input.packs[owner]!.id !== owner)
      issues.push(`${owner}: -/-: layout overrides belong to an undeclared pack`);
  return issues;
}

/** Mechanical pack checks (plan 4.10 rules 6, 7 and the pack portion of 14). */
export function checkPacks(input: Input): string[] {
  return [
    ...checkOwnership(input),
    ...checkArchetypeOverrides({ ...input, archetypes }),
    ...Object.values(input.packs).flatMap((pack) => [
      ...checkMeta(input, pack),
      ...checkExample(input, pack),
    ]),
    ...checkComponents(input),
  ];
}

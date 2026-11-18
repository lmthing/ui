import { packIds, type PackId, type PackMeta, type ArchetypeMeta } from "../meta";
import type { Definition } from "../probes";
import { registryOf } from "../registry";

type Input = {
  components: Record<string, Definition>;
  packOf: Partial<Record<string, PackId>>;
  packs: Partial<Record<PackId, PackMeta>>;
  packArchetypes: Partial<Record<PackId, readonly ArchetypeMeta[]>>;
  packExamples: Partial<Record<PackId, string>>;
};
const denseIds = new Set(
  "Slots Roster MealPlan Timetable HabitGrid Table Board Bracket Standings Seating FindDate Invoice OrderSummary Cart Timesheet CookSteps Ingredients GroceryList Medication Agenda BabyLog Workout ServiceMenu ChapterList GuestList Itinerary PackingList Registry Squad Lineup MatchFeed Storage ProductGrid Library Achievements Factors Feelings SymptomLog Stories Path Things CareSchedule Pantry FoodLog Devices Feed Comments Entries".split(
    " ",
  ),
);

function checkMeta(input: Input, pack: PackMeta): string[] {
  const issues: string[] = [];
  const nearest = packIds.filter((id) => id !== pack.id && new RegExp(`\\b${id}\\b`).test(pack.pick));
  if (!pack.purpose.trim() || !nearest.length) issues.push(`${pack.id}: purpose/pick`);
  if ((input.packArchetypes[pack.id]?.length ?? 0) < 2) issues.push(`${pack.id}: archetypes`);
  const probes = pack.probes.filter((probe) => probe.kind === "pack");
  const positive = probes.filter((probe) => probe.expect.includes(pack.id));
  const miss = probes.some(
    (probe) => !probe.expect.includes(pack.id) && nearest.some((id) => probe.expect.includes(id)),
  );
  if (probes.length < 3 || positive.length < 2 || !miss) issues.push(`${pack.id}: probes`);
  if (probes.some((probe) => probe.expect.length > 3 || probe.expect.some((id) => !packIds.includes(id))))
    issues.push(`${pack.id}: expect`);
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
    if (meta.aliases.some((alias) => !/^[a-z]+$/.test(alias))) issues.push(`${meta.id}: aliases`);
    const parts = new Set([...(meta.parts ?? ["root"]), ...(meta.items?.parts ?? [])]);
    if ([...(meta.confirmParts ?? []), ...Object.keys(meta.partTiers ?? {})].some((part) => !parts.has(part)))
      issues.push(`${meta.id}: parts`);
    if (denseIds.has(meta.id) && !meta.dense) issues.push(`${meta.id}: dense`);
    return issues;
  });
}

function checkAliases(input: Input): string[] {
  const defs = Object.values(input.components);
  const owners = new Map<string, Definition[]>();
  const issues: string[] = [];
  const normal = (name: string) => name.replace(/[\s_-]/g, "").toLowerCase();
  // Each alias conflict involves two owners; their packs form a legal scope of at most two.
  for (const def of defs)
    for (const alias of def.meta.aliases) {
      const word = normal(alias);
      for (const previous of owners.get(word) ?? []) {
        if (previous.meta.id === def.meta.id) continue;
        const packs = [input.packOf[def.meta.id], input.packOf[previous.meta.id]];
        const exact = defs.some(
          ({ meta }) =>
            normal(meta.id) === word && (!input.packOf[meta.id] || packs.includes(input.packOf[meta.id])),
        );
        if (!exact) issues.push(`alias ${word}: ${previous.meta.id}/${def.meta.id}`);
      }
      owners.set(word, [...(owners.get(word) ?? []), def]);
    }
  return issues;
}

/** Mechanical pack checks (plan 4.10 rules 6, 7 and the pack portion of 14). */
export function checkPacks(input: Input): string[] {
  return [
    ...Object.values(input.packs).flatMap((pack) => [
      ...checkMeta(input, pack),
      ...checkExample(input, pack),
    ]),
    ...checkComponents(input),
    ...checkAliases(input),
  ];
}

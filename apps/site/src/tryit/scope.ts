import { components, packOf, writerFormat } from "@lmthing/ui/catalog";
import { site } from "../data/site";

export type Defn = {
  meta: { id: string; purpose: string; codeOwned?: boolean };
  props: unknown;
  examples: unknown[];
};
export type Scope = { ids: string[]; defs: Defn[]; pack: string | null; entries: string };

/** One short prompt entry: what the component is for and one real example line (the schema carries the rest). */
const entryOf = (def: Defn) =>
  `- ${def.meta.id}: ${def.meta.purpose}\n  ${JSON.stringify({ c: def.meta.id, ...(def.examples[0] as object) })}`;

/** Ten core components core components: enough for a real screen, small enough for a small model's context. */
export const coreIds = [
  "Header",
  "Hero",
  "List",
  "Card",
  "Stats",
  "KeyValue",
  "Checklist",
  "Progress",
  "Button",
  "Actions",
];

const packWords: Record<string, string[]> = {
  booking: ["dog", "walk", "appointment", "booking", "salon", "class", "slot"],
  kitchen: ["recipe", "meal", "cook", "grocer", "food", "kitchen"],
  health: ["workout", "medic", "health", "exercise", "symptom", "fitness"],
  customers: ["client", "customer", "crm"],
};
const packLimit = 4;

/** The one pack (live only) whose words appear in the request, or none. */
export function packFor(request: string): string | null {
  const text = request.toLowerCase();
  const live = new Set(site.packs.filter((p) => p.ready).map((p) => p.id));
  return (
    Object.entries(packWords).find(
      ([id, words]) => live.has(id) && words.some((w) => text.includes(w)),
    )?.[0] ?? null
  );
}

/** The small registry the model is asked to write from: core components plus at most one pack. */
export function scopeFor(request: string): Scope {
  const pack = packFor(request);
  const all = components as unknown as Record<string, Defn>;
  const owner = packOf as Record<string, string | undefined>;
  const packIds = pack
    ? Object.keys(all)
        .filter((id) => owner[id] === pack && all[id]!.meta && !all[id]!.meta.codeOwned)
        .slice(0, packLimit)
    : [];
  const ids = [...coreIds.filter((id) => all[id]), ...packIds];
  const defs = ids.map((id) => all[id]!);
  return { ids, defs, pack, entries: defs.map(entryOf).join("\n") };
}

/** The JSON Schema for `{ "lines": [...] }`, each line one branch of `writerFormat(registry)`. */
export function linesSchema(scope: Scope, maxLines = 7) {
  const line = writerFormat({ ids: scope.ids, defs: scope.defs as never }).json_schema.schema;
  return {
    type: "object",
    properties: { lines: { type: "array", items: line, minItems: 3, maxItems: maxLines } },
    required: ["lines"],
    additionalProperties: false,
  } as const;
}

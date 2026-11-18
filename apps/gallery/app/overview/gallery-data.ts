import {
  components,
  packOf,
  presets,
  type ComponentName,
  type Meta,
  type StateName,
} from "@lmthing/ui/catalog";

export const modes = ["light", "dark"] as const;
export const groups = ["structure", "content", "data", "input", "action", "beyond", "escape"] as const;
export type GalleryGroup = string;
export type Cell = { id: ComponentName; example: unknown; index: number; state: StateName };
export const componentIds = (Object.keys(components) as ComponentName[]).sort();

// Keep the original grid: filled examples, then other states using the first example.
export function cellsOf(id: ComponentName): Cell[] {
  const { meta, examples } = components[id];
  const states = (meta as Meta).states ?? ["filled"];
  return [
    ...examples.map((example, index) => ({ id, example, index, state: "filled" as const })),
    ...states
      .filter((state) => state !== "filled")
      .map((state) => ({ id, example: examples[0], index: 0, state })),
  ];
}

export function variantCount(id: ComponentName): number {
  return cellsOf(id).length * presets.length * modes.length;
}

export function groupedIds(
  filter: string,
  pack?: string | null,
): { group: GalleryGroup; ids: ComponentName[] }[] {
  const text = filter.trim().toLowerCase();
  const ownership = packOf as Record<string, string | undefined>;
  const packGroups = [...new Set(Object.values(ownership))].filter((id): id is string => !!id).sort();
  return [...groups, ...packGroups]
    .map((group) => ({
      group,
      ids: componentIds.filter((id) => {
        const { meta } = components[id];
        return (
          (ownership[id] ? ownership[id] === group : meta.group === group) &&
          (!pack || ownership[id] === pack) &&
          (id.toLowerCase().includes(text) || meta.purpose.toLowerCase().includes(text))
        );
      }),
    }))
    .filter(({ ids }) => ids.length > 0);
}

export const draftLabel = (id: string) => `${id} · draft`;

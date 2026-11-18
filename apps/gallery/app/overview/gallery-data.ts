import { components, presets, type ComponentName, type Meta, type StateName } from "@lmthing/ui/catalog";

export const modes = ["light", "dark"] as const;
export const groups = ["structure", "content", "data", "input", "action", "beyond", "escape"] as const;
export type GalleryGroup = (typeof groups)[number];
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

export function groupedIds(filter: string): { group: GalleryGroup; ids: ComponentName[] }[] {
  const text = filter.trim().toLowerCase();
  return groups
    .map((group) => ({
      group,
      ids: componentIds.filter((id) => {
        const { meta } = components[id];
        return (
          meta.group === group &&
          (id.toLowerCase().includes(text) || meta.purpose.toLowerCase().includes(text))
        );
      }),
    }))
    .filter(({ ids }) => ids.length > 0);
}

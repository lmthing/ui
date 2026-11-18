import type { ArchetypeMeta, ComposeProbe, Slot } from "./types";
/** A short data vocabulary: alternatives, optional slots, variants and bounded repetitions. */
export function createMeta(
  id: string,
  purpose: string,
  recipes: Record<string, string>,
  guidance: Record<string, readonly string[]> = {},
): ArchetypeMeta {
  const layouts = Object.fromEntries(
    Object.entries(recipes).map(([layout, recipe]) => {
      const slots: Slot[] = recipe.split(/\s+/).map((token, index) => {
        const optional = token.endsWith("?");
        const [names = "", variantCount] = token.replace(/\?$/, "").split(":");
        const [name, repeat] = names.split("*");
        const [min = 1, max = min] = repeat ? repeat.split("..").map(Number) : [];
        return {
          id: `slot${index + 1}`,
          allow: name!.split("|"),
          min: optional ? 0 : min,
          max,
          ...(variantCount ? { variant: variantCount } : {}),
        };
      });
      return [layout, { slots, ...(guidance[layout] ? { writeHints: guidance[layout] } : {}) }];
    }),
  );
  const defaults = Object.fromEntries(
    Object.entries(layouts).map(([layout, { slots }]) => [
      layout,
      slots.flatMap((slot) =>
        Array.from({ length: slot.min }, () => ({
          c: slot.allow[0]!,
          ...(slot.variant ? { variant: slot.variant } : {}),
        })),
      ),
    ]),
  );
  return { id, purpose, layouts, defaults };
}
export function composeProbes(meta: ArchetypeMeta): ComposeProbe[] {
  return Object.keys(meta.layouts).map((layout) => ({
    kind: "compose",
    archetype: meta.id,
    layout,
    brief: `Build a ${layout} screen for this app: ${meta.purpose.toLowerCase()}. Use the supplied real content and the layout recipe.`,
  }));
}

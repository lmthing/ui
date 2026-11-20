import type { ArchetypeMeta } from "../../meta";
import type { CoreArchetypeMeta } from "../../archetypes";

type CompositionInput = Omit<ArchetypeMeta, "defaultLayout"> & {
  defaultLayout?: string;
  packOverride?: true;
};

/** Pack defaults are component seeds, completed by the same cast fallbacks as core recipes. */
export function packComposition(meta: CompositionInput): CoreArchetypeMeta {
  return {
    id: meta.id,
    purpose: meta.job,
    layouts: Object.fromEntries(
      Object.entries(meta.layouts).map(([id, layout]) => [
        id,
        {
          ...(meta.packOverride ? { packOverride: true as const } : {}),
          ...(layout.writeHints ? { writeHints: layout.writeHints } : {}),
          slots: layout.recipe.map((slot, index) => ({
            id: `slot_${index}`,
            allow: slot.allow,
            min: slot.min ?? (slot.required ? 1 : 0),
            max: slot.max ?? 1,
            ...(slot.variant ? { variant: slot.variant } : {}),
          })),
        },
      ]),
    ),
    defaults: Object.fromEntries(
      Object.entries(meta.layouts).map(([id, layout]) => [
        id,
        layout.defaults.map(({ c, id: _id, state: _state, ...seed }) => {
          const variant = c === "Field" || c === "Camera" ? seed.kind : seed.style;
          return {
            c,
            ...(typeof variant === "string" ? { variant } : {}),
            ...(Object.keys(seed).length ? { seed } : {}),
          };
        }),
      ]),
    ),
  };
}

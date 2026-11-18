import type { ArchetypeMeta } from "../../meta";
import type { CoreArchetypeMeta } from "../../archetypes";

/** Pack defaults are component seeds, completed by the same cast fallbacks as core recipes. */
export function packComposition(meta: ArchetypeMeta): CoreArchetypeMeta {
  return {
    id: meta.id,
    purpose: meta.job,
    layouts: Object.fromEntries(
      Object.entries(meta.layouts).map(([id, layout]) => [
        id,
        {
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
        layout.defaults.map((line) => ({
          c: line.c,
          ...(typeof (line.kind ?? line.style) === "string"
            ? { variant: String(line.kind ?? line.style) }
            : {}),
        })),
      ]),
    ),
  };
}

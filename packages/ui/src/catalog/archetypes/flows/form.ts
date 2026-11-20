import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "form",
  "Add or change a thing",
  {
    short: "Header Field*3..5 Button",
    stepped: "Header Steps Field*3..5 Button",
  },
  {
    short: [
      "When records are supplied, edit one of them. Name that record in the Header and prefill Fields from the same record; use the supplied field names as readable labels. Leave Header action null. End with one Save button for that record and no competing action.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

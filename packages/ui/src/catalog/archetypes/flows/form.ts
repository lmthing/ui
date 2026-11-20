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
      "When records are supplied, edit one of them. Name it in Header.title, e.g. Edit Fern. Header.sub tells the person to change the prefilled details and tap Save changes. Leave action and axes null. Prefill three distinct facts from the same record with recognizable labels, such as Plant name, Room and Watering interval. Finish with one primary Save changes button for that record, not a generic navigation action.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

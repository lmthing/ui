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
      "When records are supplied, edit one of them. Name that record in Header.title, e.g. Edit Fern; set Header.action, density, detail and emphasis to literal null. Prefill fields from that same record in a natural order, using sentence-case labels the person would recognize, such as Plant name, Room and Watering interval. End with one primary Save button for the named record; no competing action.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

import { createMeta, composeProbes } from "./recipe";
import type { ArchetypeMeta } from "./types";
export const meta = createMeta(
  "list",
  "All things of one kind",
  {
    plain: "Header Chips List Button",
    grouped: "Header Chips SectionTitle List SectionTitle? List? SectionTitle? List? Button",
    gallery: "Header Chips Gallery Button",
  },
  {
    grouped: [
      "Group every supplied record by its category field, once each, with no duplicates and no invented due dates. Use one SectionTitle and one List per group, up to three groups.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

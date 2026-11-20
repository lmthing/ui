import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
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
      "Keep each row’s supplied detail visible: leave detail, overflow, group and mark null. SectionTitle already names each group. Use the actual group names in the filter chips and leave the optional Header action null so the Button is the one main next action.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

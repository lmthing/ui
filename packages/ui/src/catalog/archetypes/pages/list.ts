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
      "Name the collection in Header.title. Set Header.action to literal null and tell the person in Header.sub that they can filter by category and tap a record to open it. Select All in Chips, add one unselected filter for each real category, and leave Chips.lead and every chip icon null.",
      "Keep each row’s supplied detail visible and link the row to that record. Leave detail, overflow, group and mark null; the SectionTitle already names the group. The last Button is the only creation action: label it Add followed by the record type (for example, Add plant) and set goto to its new-record screen (for example, add_plant). Do not offer a different action such as logging care on this collection screen.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
const action =
  "Use a primary Button only when this collection has its own main task. For example, add a creation Button only when the brief calls for creation. Open existing records from their rows, not from a footer.";
export const meta = createMeta(
  "list",
  "All things of one kind",
  {
    plain: "Header Chips List Button?",
    grouped: "Header Chips SectionTitle List SectionTitle? List? SectionTitle? List? Button?",
    gallery: "Header Chips Gallery Button?",
  },
  {
    plain: [action],
    grouped: [
      "Group every supplied record by its category field, once each, with no duplicates and no invented due dates. Use one SectionTitle and one List per group, up to three groups.",
      "Name the collection in Header.title. Keep Header.action and its axes null. Make Header.sub a complete instruction within 40 characters, e.g. “Filter rooms, then tap a plant”. Select All in Chips, add one unselected filter for each real category, and leave Chips.lead and every chip icon null. Use each SectionTitle as a plain category label, with no link and null axes.",
      "Keep each row’s supplied detail visible and link the row to that record. Leave detail, overflow, group and mark null; the SectionTitle already names the group.",
      action,
    ],
    gallery: [action],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

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
      "Edit one supplied record. Use a Header that names it (e.g. Edit Fern) and the short subtitle Update details, then save. Leave Header.action and all axes null.",
      "Prefill three distinct Fields for that same record, in reading order. For plant care: Plant name and Room are text, then Watering interval (days) is a number with the supplied interval as digits in a string. Finish with one primary Save changes button that goes to the record's detail screen after saving (e.g. fern_detail).",
    ],
    stepped: [
      "Show the first step of editing one supplied record. Use its actual name in Header.title; the subtitle says to check the details before reviewing. Steps starts at 1 of 2, labelled Details. Prefill three Fields with the current record's actual values, with specific labels and units where known. The only Button says Review changes and goes to review_changes. Leave Field and Button axes null.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

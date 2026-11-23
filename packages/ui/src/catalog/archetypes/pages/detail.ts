import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
const action =
  "Use a primary Button only for a specific requested task on this record. A read-only detail needs no Button. Never use the Button to go back.";
export const meta = createMeta(
  "detail",
  "One thing, fully",
  {
    facts: "Header KeyValue Note Button?",
    media: "Header Photo KeyValue Button?",
    progress: "Header Progress:ring KeyValue Button?",
  },
  {
    facts: [
      "Choose one supplied record and use its name as the Header title. KeyValue shows that record's actual fields, not facts about other records. The Note can explain a supplied fact such as a recurring care interval; it is not a generic sample-data disclaimer. A recurring interval does not mean the action is due today.",
      action,
    ],
    media: [action],
    progress: [
      "Choose one supplied record. Use its name as the Header title and show only its actual fields in KeyValue. If no measured progress is supplied, use the circular Progress goal to count that record's filled detail fields out of the supplied field list, labelled Details recorded. Do not count records or invent completed care.",
      action,
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

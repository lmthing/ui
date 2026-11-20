import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "detail",
  "One thing, fully",
  {
    facts: "Header KeyValue Note Button",
    media: "Header Photo KeyValue Button",
    progress: "Header Ring KeyValue Button",
  },
  {
    facts: [
      "Choose one supplied record and use its name as the Header title. KeyValue shows that record's actual fields, not facts about other records. The Note makes a supplied fact useful for the next action, such as a recurring care interval; it is not a generic sample-data disclaimer. Label the Button to log or manage that record and link to the matching next screen. A recurring interval does not mean the action is due today.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

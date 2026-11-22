import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "checklist",
  "Independent jobs to tick off",
  {
    simple: "Header Checklist Note Button",
    progress: "Header Progress:ring Checklist Button",
  },
  {
    simple: [
      "Checklist item meta is at most 24 characters. Abbreviate intervals, for example every 7d. Header title and Button label are also at most 24.",
    ],
    progress: [
      "Checklist item meta and circular progress label are at most 24 characters. Abbreviate intervals rather than copying a long care sentence.",
      "Give the ring one label naming the day's goal, for example Watering goal. Set value to the number of completed checklist items and of to the total number of items. Do not repeat either count in the label; the ring already shows both.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

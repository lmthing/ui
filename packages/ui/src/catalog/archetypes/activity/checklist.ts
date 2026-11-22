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
      "Lead with a Header naming the checklist's job, with no Header action. Follow it with the progress ring, the individual jobs to tick off, then one Button to log the same work. Use a specific Button label, not Continue or a claim that all jobs are done.",
      "Checklist item meta and circular progress label are at most 24 characters. Abbreviate intervals rather than copying a long care sentence.",
      "Use one ring goal with a label naming what was completed, for example Plants watered. Set value to the number of completed checklist items and of to the total number of items. The ring already shows both counts. Start each job with its action verb and keep supplied details in visible item meta.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

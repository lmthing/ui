import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "home",
  "What matters now",
  {
    focus: "Header Hero List|Checklist|Timeline Stats? Button",
    feed: "Header Hero List Card? Button",
    board: "Header Hero Stats List Button",
  },
  {
    feed: [
      "Show the supplied records and their known details. If no due date or completion is supplied, show the regular schedule, not invented urgency. Omit the optional Card unless it adds something the List does not already show.",
    ],
    board: [
      "Use Stats for counts you can derive directly from the supplied records. Keep the List focused on the known details of each record, not guessed deadlines, alerts or completion.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

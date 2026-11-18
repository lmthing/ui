import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "checklist",
  "Independent jobs to tick off",
  {
    simple: "Header Checklist Note Button",
    progress: "Header Ring Checklist Button",
  },
  {
    simple: [
      "Checklist item meta is at most 24 characters. Abbreviate intervals, for example every 7d. Header title and Button label are also at most 24.",
    ],
    progress: [
      "Checklist item meta and Ring label are at most 24 characters. Abbreviate intervals rather than copying a long care sentence.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

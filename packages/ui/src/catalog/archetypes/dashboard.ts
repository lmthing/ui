import { createMeta, composeProbes } from "./recipe";
import type { ArchetypeMeta } from "./types";
export const meta = createMeta(
  "dashboard",
  "How things are going",
  { rings: "Header Stats Ring List", charts: "Header Stats Bars List" },
  {
    charts: [
      "Bars columns have labels of at most four characters, even when the source name is longer. Abbreviate every category consistently; keep full names in the following List. Compare one meaningful measured unit.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

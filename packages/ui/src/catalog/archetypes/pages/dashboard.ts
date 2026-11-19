import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "dashboard",
  "How things are going",
  { rings: "Header Stats Ring List", charts: "Header Stats Bars List" },
  {
    rings: [
      "Make the List a way to open the underlying records: include each record's supplied detail and a goto for that record. Keep the default navigation trail unless another trail is explicitly requested.",
    ],
    charts: [
      "Bars columns have labels of at most four characters, even when the source name is longer. Abbreviate every category consistently; keep full names in the following List. Compare one meaningful measured unit.",
      "The List explains the abbreviated bars. Show each full name and its supplied detail. Leave detail and row mark null unless explicitly requested; a larger or smaller bar does not request a highlight.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

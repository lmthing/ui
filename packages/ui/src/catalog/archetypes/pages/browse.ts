import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "browse",
  "Explore shelves of things to open",
  { shelves: "Header Search Chips SectionTitle List:shelf SectionTitle List:shelf" },
  {
    shelves: [
      'Name the collection in Header.title. Use Header.sub (40 characters max) to explain the two destinations, for example "Open a plant or view its care plan". Keep a separate Add action that opens the new-record screen. Search finds records by name. In Chips, select All initially and let the other chips filter by real categories.',
      'Use two Lists with style "shelf", at least two rows each, and a supplied photo and goto on every row. The first shows all records with their location or category and opens record details. The second is a smaller set of shortcuts to manage care, not a second inventory: when at least two records have weekly or more frequent care, title it "Weekly care or sooner", show only those records with their actual intervals, and link to their care plans. Use another grounded subset when that example does not fit. Leave unrequested axes null; do not invent recency or deadlines.',
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

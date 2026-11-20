import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "browse",
  "Explore shelves of things to open",
  { shelves: "Header Search Chips SectionTitle List:shelf SectionTitle List:shelf" },
  {
    shelves: [
      'Name the collection in Header.title. Show Header.sub (40 characters max), e.g. "Open a plant or view its care plan"; keep Header axes null. Keep a separate Add action opening the new-record screen. Search finds records by name. In Chips, select All initially and filter by real categories.',
      'Use two Lists with style "shelf", at least two rows each, each introduced by a SectionTitle with null axes and no link. Give every row a supplied photo and a goto. The first shelf shows all records with their location or category and opens record details. The second is a shortcut to manage care, not another inventory: if two or more records have weekly or more frequent care, title it "Weekly care or sooner", show only those records with their actual intervals, and go directly to their care plans, not their record details. Otherwise use another grounded subset. Leave unrequested axes null; do not invent recency or deadlines.',
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

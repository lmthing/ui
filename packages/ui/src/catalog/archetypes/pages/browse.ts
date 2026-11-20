import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "browse",
  "Explore shelves of things to open",
  { shelves: "Header Search Chips SectionTitle List:shelf SectionTitle List:shelf" },
  {
    shelves: [
      'Name the collection in Header.title. Show Header.sub (40 characters max), e.g. "Open a plant or view its care plan"; keep Header axes null. Keep a separate Add action opening the new-record screen. Search finds records by name. In Chips, select All initially and filter by real categories.',
      'Use two Lists with style "shelf", each introduced by a SectionTitle with null axes and no link. Each shelf needs at least two rows, and every row in both shelves must carry its supplied photo reference. The first shelf shows the inventory, with location and record_<name> destinations. The second links directly to careplan_<name>: when two or more records have weekly or more frequent care, title it "Weekly care or sooner", order those records by shortest interval and show their actual intervals; otherwise choose another grounded subset of at least two. Use null for all List and row axes.',
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

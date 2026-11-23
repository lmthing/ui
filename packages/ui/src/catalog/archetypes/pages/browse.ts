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
      "Use shelves only when these records have supplied media. Use an ordinary text-first list with small thumbnails for the available images if some records have none; never invent a local reference or fill a shelf with unrelated covers. In this plant sample use All plants and Weekly care or sooner as section titles, and shorten care facts to Every 3 days and Every 7 days. The collection header and shelves already lead, so omit Hero.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

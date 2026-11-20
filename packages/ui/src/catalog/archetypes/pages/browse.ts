import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "browse",
  "Explore shelves of things to open",
  { shelves: "Header Search Chips SectionTitle List:shelf SectionTitle List:shelf" },
  {
    shelves: [
      'Name the collection in Header.title. Show Header.sub (40 characters max), e.g. "Open a plant or view its care plan"; keep Header axes null. Keep a separate Add action opening the new-record screen. Search finds records by name. In Chips, select All initially and filter by real categories.',
      'Use two Lists with style "shelf", at least two rows each, each introduced by a SectionTitle with null axes and no link. The first shelf is the inventory: give each row its supplied photo and location, and a record_<name> destination. The second shelf is a shortcut to manage recurring care, not another inventory: if two or more records have weekly or more frequent care, title it "Weekly care or sooner", show only those records with their actual intervals (shortest interval first), and link each directly to careplan_<name>. Otherwise use another grounded subset. Use null for every List and row axis; photo and navigation already work without accessory overrides.',
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

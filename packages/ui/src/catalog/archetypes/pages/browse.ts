import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "browse",
  "Explore shelves of things to open",
  { shelves: "Header Search Chips SectionTitle List SectionTitle List" },
  {
    shelves: [
      'Name the collection in Header.title. Show Header.sub (40 characters max), e.g. "Open a plant or view its care plan"; keep Header axes null. Keep a separate Add action opening the new-record screen. Search finds records by name. In Chips, select All initially and filter by real categories.',
      'Use two Lists, each preceded by a SectionTitle. Use style "shelf" only when that list has at least two records and every row has its own supplied image reference. Otherwise use default List style with lead "thumb"; include only the references that were supplied. Never invent a local reference or use unrelated covers.',
      'The first List shows All plants with locations and record_<name> destinations. The second links to careplan_<name>. If at least two records have weekly or more frequent care, title it "Weekly care or sooner", order from shortest interval and use facts like Every 3 days and Every 7 days. Otherwise use another grounded subset. Omit Hero: the collection header already leads.',
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

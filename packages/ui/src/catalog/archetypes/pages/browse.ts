import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
import type { ScreenLike } from "../../agent";
export const meta = createMeta(
  "browse",
  "Explore shelves of things to open",
  { shelves: "Header Search Chips SectionTitle List:shelf SectionTitle List:shelf" },
  {
    shelves: [
      'Name the collection in Header.title. Show Header.sub (40 characters max), e.g. "Open a plant or view its care plan"; keep Header axes null. Keep a separate Add action opening the new-record screen. Search finds records by name. Bind Chips.filter to the first List id and field category. Tag each row on that shelf with its category. Supply view.match and view.empty for each real category chip, all off initially. Leave the care-plan shelf independent.',
      'Use two Lists with style "shelf", each introduced by a SectionTitle with null axes and no link. Each shelf needs at least two rows, and every row in both shelves must carry its supplied photo reference. The first shelf shows the inventory, with location and record_<name> destinations. The second links directly to careplan_<name>: when two or more records have weekly or more frequent care, title it "Weekly care or sooner", order those records by shortest interval and show their actual intervals; otherwise choose another grounded subset of at least two. Use null for all List and row axes.',
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

export const dataViewExample = {
  id: "browse_plants",
  components: [
    {
      id: "heading",
      c: "Header",
      title: "Browse plants",
      sub: "Find plants and open their care plans",
      action: { icon: "plus", label: "Add plant", goto: "new_plant" },
    },
    { id: "search", c: "Search", hint: "Find a plant" },
    {
      id: "rooms",
      c: "Chips",
      filter: { list: "inventory", field: "category" },
      items: [
        { label: "Kitchen", view: { match: "Kitchen", empty: "No kitchen plants to browse" } },
        { label: "Bathroom", view: { match: "Bathroom", empty: "No bathroom plants to browse" } },
      ],
    },
    { id: "inventory_title", c: "SectionTitle", text: "Plant inventory" },
    {
      id: "inventory",
      c: "List",
      style: "shelf",
      rows: [
        { title: "Basil", meta: "Kitchen", category: "Kitchen", photo: "lib:basil", goto: "record_basil" },
        { title: "Fern", meta: "Bathroom", category: "Bathroom", photo: "lib:fern", goto: "record_fern" },
      ],
    },
    { id: "care_title", c: "SectionTitle", text: "Weekly care or sooner" },
    {
      id: "care",
      c: "List",
      style: "shelf",
      rows: [
        { title: "Basil", meta: "Every 4 days", photo: "lib:basil", goto: "careplan_basil" },
        { title: "Fern", meta: "Weekly", photo: "lib:fern", goto: "careplan_fern" },
      ],
    },
  ],
} satisfies ScreenLike;

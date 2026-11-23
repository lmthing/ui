import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
import type { ScreenLike } from "../../agent";
export const meta = createMeta(
  "browse",
  "Explore shelves of things to open",
  { shelves: "Header Search Chips SectionTitle List SectionTitle List" },
  {
    shelves: [
      'Name the collection in Header.title. Show Header.sub (40 characters max), e.g. "Open a plant or view its care plan"; keep Header axes null. Keep a separate Add action opening the new-record screen. Search finds records by name.',
      'Chips in filter style controls only the first List: set filter.list to that exact id and filter.field to "category". For plant records, put each literal room (e.g. "Bathroom", "Kitchen", "Living room") in its row category, not the plant kind. Give each distinct room exactly one chip: on:false, view.panel:null, view.match equal to the room exactly, and view.empty naming that room. Never add an All chip; all off already shows the full inventory.',
      'Use two Lists, each introduced by a SectionTitle with null axes and no link. Use style "shelf" only when that List has at least two records and every row has its supplied image reference. Otherwise use the default List style with lead "thumb". Include only supplied references; never invent a local reference or use unrelated covers. Leave other List and row axes null.',
      'The first List shows the inventory with locations and record_<name> destinations. The second links to careplan_<name>. If at least two records have weekly or more frequent care, title it "Weekly care or sooner", order from shortest interval and show the supplied intervals. Otherwise use another grounded subset. Omit Hero: the collection header already leads.',
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

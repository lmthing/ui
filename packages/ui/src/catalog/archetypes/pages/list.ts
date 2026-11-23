import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
import type { ScreenLike } from "../../agent";
const action =
  "Use a primary Button only when this collection has its own main task. For example, add a creation Button only when the brief calls for creation. Open existing records from their rows, not from a footer.";
export const meta = createMeta(
  "list",
  "All things of one kind",
  {
    plain: "Header Chips List Button?",
    grouped: "Header SectionTitle List SectionTitle? List? SectionTitle? List? Button?",
    gallery: "Header SectionTitle Gallery Button?",
  },
  {
    plain: [
      "Use Chips in filter style and start with every chip off. Bind Chips.filter to the List's id and field category. Put the actual category on each row, and supply view.match and view.empty per chip. Do not add an All chip: no active filters shows all rows.",
      action,
    ],
    grouped: [
      "Group every supplied record by its category field, once each, with no duplicates and no invented due dates. Use one SectionTitle and one List per group, up to three groups.",
      "Name the collection in Header.title. Keep Header.action and its axes null. Make Header.sub a complete instruction within 40 characters, e.g. “Open a plant from its room”. Use each SectionTitle as a plain category label, with no link and null axes. Do not add a filter control to these separate groups; use the plain layout for a filterable List.",
      'With plant records, use Header.title "Plants by room" and Header.sub "Open a plant from its room". Use SectionTitle.text for each literal room. Under it set the row title to the plant name, meta to the actual care interval, and goto to that plant only. Do not repeat the room in the row. Leave unrequested axes null.',
      "This browse-only brief does not ask to add records. Set Header.action to null and omit Button. The row links are the only actions.",
    ],
    gallery: [
      'Name the collection in Header and explain that the photos open records. Name the set of photos in SectionTitle, distinct from the page title, e.g. "Reference photos" for the supplied plant sample. Use Gallery only for supplied images; give each a caption naming its record and a link to it. Omit Chips: category filters require a List. For a category-filtered collection, use the plain layout instead.',
      action,
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

export const dataViewExample = {
  id: "plant_list",
  components: [
    { id: "heading", c: "Header", title: "Plant collection", sub: "Filter rooms, then open a plant" },
    {
      id: "rooms",
      c: "Chips",
      filter: { list: "plants", field: "category" },
      items: [
        { label: "Kitchen", view: { match: "Kitchen", empty: "No plants in the kitchen" } },
        { label: "Bathroom", view: { match: "Bathroom", empty: "No plants in the bathroom" } },
        { label: "Living room", view: { match: "Living room", empty: "No plants in the living room" } },
        { label: "Balcony", view: { match: "Balcony", empty: "No plants on the balcony" } },
        { label: "Hallway", view: { match: "Hallway", empty: "No plants in the hallway" } },
        { label: "Bedroom", view: { match: "Bedroom", empty: "No plants in the bedroom" } },
      ],
    },
    {
      id: "plants",
      c: "List",
      rows: [
        { title: "Fern", meta: "Bathroom", category: "Bathroom", goto: "fern" },
        { title: "Basil", meta: "Kitchen", category: "Kitchen", goto: "basil" },
        { title: "Monstera", meta: "Living room", category: "Living room", goto: "monstera" },
      ],
    },
  ],
} satisfies ScreenLike;

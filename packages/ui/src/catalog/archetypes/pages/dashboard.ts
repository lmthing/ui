import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
import type { ScreenLike } from "../../agent";
export const meta = createMeta(
  "dashboard",
  "How things are going",
  { rings: "Header Segmented? Stats Progress:ring? List", charts: "Header Stats Bars List" },
  {
    rings: [
      'Include Progress only for a supplied completed amount and target for the same goal. Use style "ring", one bars item with label, value and of, and copy any supplied unit and deadline. The plant sample gives care intervals and locations, not logged work: omit Progress. A plant count may inform Stats, but is not progress.',
      "Include Segmented only if both Stats and Progress are present and offer useful alternative views. Bind one tab to each sibling id and supply an empty message for each tab.",
      "Make the List a way to open the underlying records: include each record's supplied detail and a goto for that record. Keep the default navigation trail unless another trail is explicitly requested.",
      'For the plant sample, title the screen "Plant care schedules" and set the subtitle to "Open a plant to review its care". Use Stats for the total plant count. Order the List by the supplied watering interval, shortest first, with each room in meta and the actual interval in fact, e.g. "Every 3 days". Do not call the intervals due dates.',
    ],
    charts: [
      "Make the chart the focus. Compare a single supplied measure with a specific title and unit. Every column label must be at most four characters: for Basil, Fern and Monstera use Basi, Fern and Mons.",
      "Use Stats only for quantities supported by the cast, such as the count of records. A recurring interval does not say how many are due, overdue or complete. Do not assert those counts in Stats or the header without actual activity or due dates.",
      "Give the overview one clear path from comparison to record: use a specific Header title and no Header action unless requested. In the same order as the bars, show full names and a distinct supplied fact in the List rather than repeating each bar value. Use each supplied record destination or a record_<name> link for a named record; leave List detail and row mark null unless requested.",
      'For the plant sample, use "Watering schedules" as the Header title and "Watering interval (days)" as the Bars title. Set Bars detail to brief: the intervals are not additive, so their sum would mislead. Use the supplied rooms in the List and link each row to its plant record.',
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

export const dataViewExample = {
  id: "walk_dashboard",
  components: [
    { id: "heading", c: "Header", title: "This week's walks" },
    {
      id: "view",
      c: "Segmented",
      options: [
        { label: "Summary", view: { panel: "summary", empty: "No walk measures yet" } },
        { label: "Weekly goal", view: { panel: "goal", empty: "No goal set for this week" } },
        { label: "Last week", view: { empty: "No walks logged last week" } },
      ],
    },
    {
      id: "summary",
      c: "Stats",
      tiles: [
        { label: "Completed", value: "2" },
        { label: "Target", value: "5" },
      ],
    },
    { id: "goal", c: "Progress", style: "ring", bars: [{ label: "Weekly walk goal", value: 2, of: 5 }] },
    {
      id: "walks",
      c: "List",
      rows: [
        { title: "Park walk", meta: "Monday", goto: "park_walk" },
        { title: "River walk", meta: "Wednesday", goto: "river_walk" },
      ],
    },
  ],
} satisfies ScreenLike;

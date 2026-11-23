import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
import type { ScreenLike } from "../../agent";
export const meta = createMeta(
  "dashboard",
  "How things are going",
  { rings: "Header Segmented? Stats Progress:ring List", charts: "Header Stats Bars List" },
  {
    rings: [
      "When including Segmented, bind its tabs to the Stats and Progress sibling ids (one panel per tab), with an empty message for each. Use tabs only if both drawings are useful views of the supplied data.",
      "Make the List a way to open the underlying records: include each record's supplied detail and a goto for that record. Keep the default navigation trail unless another trail is explicitly requested.",
    ],
    charts: [
      "Make the chart the focus. Compare a single supplied measure with a specific title and unit. Every column label must be at most four characters: for Basil, Fern and Monstera use Basi, Fern and Mons.",
      "Use Stats only for quantities supported by the cast, such as the count of records. A recurring interval does not say how many are due, overdue or complete. Do not assert those counts in Stats or the header without actual activity or due dates.",
      "The List explains the abbreviated bars. Use the same order, with full names and their supplied distinguishing facts. Only offer actions with a specific destination. Leave detail and row mark null unless explicitly requested; a larger or smaller bar does not request a highlight.",
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

import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "home",
  "What matters now",
  {
    focus: "Header Hero List|Checklist|Timeline Stats? Button",
    feed: "Header Hero List Card? Button",
    board: "Header Hero Stats List Button",
  },
  {
    feed: [
      "Use the Header to name the collection and the Hero to orient the person, not to repeat the Header or a List row. For the plant sample, use My plants and a Hero about regular care, with a short subtitle such as Tap a plant to see its schedule.",
      "Show each supplied record once in the List, with its real schedule and a link to its detail. Omit the Card when the supplied records do not contain a separate story. Use one verb-led Button with a destination for the next task, e.g. Log watering → log_watering. Do not invent urgency, due dates or completion.",
    ],
    board: [
      "Use Stats for counts you can derive directly from the supplied records. Keep the List focused on the known details of each record, not guessed deadlines, alerts or completion.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

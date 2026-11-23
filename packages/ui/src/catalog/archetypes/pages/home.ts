import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
const action =
  "Include a primary Button only for a task that belongs to this screen, such as starting a new watering log. Never pin a shortcut to one record or a peer tab.";
export const meta = createMeta(
  "home",
  "What matters now",
  {
    focus: "Header Hero List|Checklist|Timeline Stats? Button?",
    feed: "Header Hero List Card? Button?",
    board: "Header Hero Stats List Button?",
  },
  {
    focus: [action],
    feed: [
      "Use the Header to name the collection and the Hero to orient the person, not to repeat the Header or a List row. For the plant sample, use My plants and a Hero about regular care, with a short subtitle such as Tap a plant to see its schedule.",
      "Show each supplied record once in the List, with its real schedule and a link to its detail. Omit the Card when the supplied records do not contain a separate story. Do not invent urgency, due dates or completion.",
      action,
    ],
    board: [
      "Use Stats for counts you can derive directly from the supplied records. Keep the List focused on the known details of each record, not guessed deadlines, alerts or completion.",
      action,
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
const action =
  "The Header names the finished task; Success confirms its result. Omit the Button unless the brief calls for a distinct next task. Never prescribe going back or reopening the just-saved record.";
export const meta = createMeta(
  "success",
  "Proof that an action worked",
  { plain: "Header Success KeyValue Button?", summary: "Header Success KeyValue Card Button?" },
  {
    plain: [
      "Make the Success title name the saved record, e.g. Fern saved. Use a brief subtitle confirming what was saved, keeping screen style, undo false and detail null. KeyValue confirms the actual saved facts.",
      action,
    ],
    summary: [
      "Show one consistent saved result: Success uses screen style and undo false, KeyValue gives its facts, and a read-only Card previews that same saved item. A Card never has both icon and photo: use icon null with a photo, or photo null with an icon. Do not invent unused badge or confirmation text.",
      action,
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

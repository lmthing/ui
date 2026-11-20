import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "success",
  "Proof that an action worked",
  { plain: "Success KeyValue Button", summary: "Success KeyValue Card Button" },
  {
    plain: [
      "Make the Success title name the saved record, e.g. Fern saved. Use a brief subtitle confirming what was saved, keeping screen style, undo false and detail null. KeyValue confirms the actual saved facts. The only visible next step is one primary Button explicitly labelled with the record name, e.g. Open Fern, and linked to that same record.",
    ],
    summary: [
      "Show one consistent saved result: Success uses screen style and undo false, KeyValue gives its facts, Card previews that same saved item, and Button opens it. A Card never has both icon and photo: use icon null with a photo, or photo null with an icon. Do not invent unused badge or confirmation text.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

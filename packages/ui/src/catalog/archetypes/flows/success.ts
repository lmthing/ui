import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "success",
  "Proof that an action worked",
  { plain: "Success KeyValue Button", summary: "Success KeyValue Card Button" },
  {
    plain: [
      "Make the Success title name what was saved from the supplied record, not a generic completion. Keep Success in screen style with undo false and detail null. Use KeyValue for the saved facts and a single Button that opens that same item.",
    ],
    summary: [
      "Show one consistent saved result: Success uses screen style and undo false, KeyValue gives its facts, Card previews that same saved item, and Button opens it. A Card never has both icon and photo: use icon null with a photo, or photo null with an icon. Do not invent unused badge or confirmation text.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

import { createMeta, composeProbes } from "./recipe";
import type { ArchetypeMeta } from "./types";
export const meta = createMeta(
  "success",
  "Proof that an action worked",
  { plain: "Success KeyValue Button", summary: "Success KeyValue Card Button" },
  {
    summary: [
      "Show one consistent saved result: Success uses screen style and undo false, KeyValue gives its facts, Card previews that same saved item, and Button opens it. A Card never has both icon and photo: use icon null with a photo, or photo null with an icon. Do not invent unused badge or confirmation text.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "settings",
  "Choices about the app",
  {
    simple: "Header List:toggle Note",
  },
  {
    simple: [
      "This screen changes app preferences, not which records are visible. Use the supplied setting labels and descriptions. List rows use trail: toggle and value: on or off for the current setting.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

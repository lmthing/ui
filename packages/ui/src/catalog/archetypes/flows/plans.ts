import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "plans",
  "Compare plans and choose an upgrade",
  {
    plans: "Header Hero Choice:prices Note Button",
  },
  {
    plans: [
      "Choice style is cards or list, never prices or plans. Each option has a short price in value. Optional icons use only the enum; use star, check or info, or omit them. Do not invent plan-switching policies. Use the supplied plan names, descriptions and prices.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

import { createMeta, composeProbes } from "./recipe";
import type { ArchetypeMeta } from "./types";
export const meta = createMeta("dashboard", "How things are going", {
  rings: "Header Stats Ring List",
  charts: "Header Stats Bars List",
}) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

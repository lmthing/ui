import { createMeta, composeProbes } from "./recipe";
import type { ArchetypeMeta } from "./types";
export const meta = createMeta("calendar", "Things by date", {
  week: "Header Calendar:week Timeline",
  month: "Header Calendar:month Timeline",
}) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

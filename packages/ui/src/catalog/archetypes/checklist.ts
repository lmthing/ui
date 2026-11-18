import { createMeta, composeProbes } from "./recipe";
import type { ArchetypeMeta } from "./types";
export const meta = createMeta("checklist", "Independent jobs to tick off", {
  simple: "Header Checklist Note Button",
  progress: "Header Ring Checklist Button",
}) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

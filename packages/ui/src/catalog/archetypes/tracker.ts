import { createMeta, composeProbes } from "./recipe";
import type { ArchetypeMeta } from "./types";
export const meta = createMeta("tracker", "Log an activity again and again", {
  counter: "Header Counter Bars Button",
  scale: "Header Scale:mood Bars Button",
  timer: "Header Timer Bars Button",
}) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

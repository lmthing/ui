import { createMeta, composeProbes } from "./recipe";
import type { ArchetypeMeta } from "./types";
export const meta = createMeta("journal", "Entries over time and room to write", {
  entries: "Header Card Button",
  photos: "Header Gallery Button",
  write: "Header Field:date Scale:mood Composer:entry Button",
}) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

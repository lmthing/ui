import { createMeta, composeProbes } from "./recipe";
import type { ArchetypeMeta } from "./types";
export const meta = createMeta("capture", "Take a picture or scan a code", {
  photo: "Header Camera:photo Note Button",
  scan: "Header Camera:scan Note Button",
}) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

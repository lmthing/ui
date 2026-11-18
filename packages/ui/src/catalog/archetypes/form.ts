import { createMeta, composeProbes } from "./recipe";
import type { ArchetypeMeta } from "./types";
export const meta = createMeta("form", "Add or change a thing", {
  short: "Header Field*3..5 Button",
  stepped: "Header Steps Field*3..5 Button",
}) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

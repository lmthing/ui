import { createMeta, composeProbes } from "./recipe";
import type { ArchetypeMeta } from "./types";
export const meta = createMeta("list", "All things of one kind", {
  plain: "Header Chips List Button",
  grouped: "Header Chips SectionTitle List SectionTitle List Button",
  gallery: "Header Chips Gallery Button",
}) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

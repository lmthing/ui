import { createMeta, composeProbes } from "./recipe";
import type { ArchetypeMeta } from "./types";
export const meta = createMeta("browse", "Explore shelves of things to open", {
  shelves: "Header Search Chips SectionTitle List:shelf SectionTitle List:shelf",
}) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

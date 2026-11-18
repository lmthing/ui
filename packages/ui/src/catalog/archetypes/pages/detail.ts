import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta("detail", "One thing, fully", {
  facts: "Header KeyValue Note Button",
  media: "Header Photo KeyValue Button",
  progress: "Header Ring KeyValue Button",
}) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta("home", "What matters now", {
  focus: "Header Hero List|Checklist|Timeline Stats? Button",
  feed: "Header Hero List Card? Button",
  board: "Header Hero Stats List Button",
}) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

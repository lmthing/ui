import { createMeta, composeProbes } from "./recipe";
import type { ArchetypeMeta } from "./types";
export const meta = createMeta("success", "Proof that an action worked", {
  plain: "Success KeyValue Button",
  summary: "Success KeyValue Card Button",
}) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

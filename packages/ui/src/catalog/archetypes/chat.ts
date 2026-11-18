import { createMeta, composeProbes } from "./recipe";
import type { ArchetypeMeta } from "./types";
export const meta = createMeta("chat", "A conversation with a place to reply", {
  thread: "Header Bubbles Composer:reply",
}) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

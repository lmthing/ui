import { createMeta, composeProbes } from "./recipe";
import type { ArchetypeMeta } from "./types";
export const meta = createMeta("onboarding", "The first few steps in the app", {
  single: "Hero Note Steps Button",
  steps: "Hero Note Steps Choice? Button",
}) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

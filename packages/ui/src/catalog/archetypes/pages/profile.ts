import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta("profile", "Me or the person this screen is about", {
  me: "Header Profile Stats List",
  person: "Header Profile Stats List",
}) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

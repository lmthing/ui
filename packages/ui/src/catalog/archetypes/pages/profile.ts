import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "profile",
  "Me or the person this screen is about",
  {
    me: "Header Profile Stats List",
    person: "Header Profile Stats List",
  },
  {
    me: [
      "Identify the current subject from the supplied records. Do not make up a name, due date, status or rating. Use Stats for actual counts or measurements and List for visible supporting records or details.",
    ],
    person: [
      "Choose one supplied record as the subject when no subject is named. Header and Profile identify that same subject, not the entire collection. Use Stats for supported measurements, not guesses. In the List, show related records or supporting details that are not already in Profile; leave overflow, detail and mark null.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

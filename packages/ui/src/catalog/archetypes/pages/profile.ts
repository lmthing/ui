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
      "Identify the current subject from the supplied records; never invent an owner, name or status. If only collection records are supplied, name the collection in Header.title and feature one record in Profile, using its real name and one known detail. Name what the viewer can explore in the Header subtitle.",
      "Use Stats for two distinct known counts or measurements; label them so their scope is clear. List related records with links to their own details; do not repeat the record already featured in Profile. Leave unrequested axes null.",
    ],
    person: [
      "Choose one supplied record as the subject when no subject is named. Header and Profile identify that same subject, not the entire collection. Use Stats for supported measurements, not guesses. In the List, show related records or supporting details that are not already in Profile; leave overflow, detail and mark null.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

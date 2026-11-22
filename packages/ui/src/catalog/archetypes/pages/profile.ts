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
      "Identify the current subject from the supplied records; never invent an owner, name or status. If only collection records are supplied, name the collection in Header.title (e.g. My plants), tell the viewer what they can browse in Header.sub, and feature one record in Profile. Keep Header.detail null so the subtitle shows.",
      "Use one useful collection action only if it has a specific destination. For plant care use Add plant with goto add_plant. Never emit an Add action without a destination. The other links go to the individual records, not another copy of the collection.",
      "Use Stats for two independently grounded quantities. With plant records and rooms, show Plants and the count of distinct Rooms, not a guessed care status. Carry the supplied room and care interval into both the featured Profile and the other List rows (e.g. Bathroom · Water every seven days, within 36 characters for a List row). Link each List row to its own details, never duplicate the featured row, and keep unrequested axes null.",
    ],
    person: [
      "Choose one supplied record as the subject when no subject is named. Header and Profile identify that same subject, not the entire collection. Use Stats for supported measurements, not guesses. Treat the selected record as the subject: feature its specific supplied facts in Profile and give one clear, relevant next action in Header.action only if it has a real destination. Use the List for related records or supporting details not already in Profile; label links by destination and do not link to a duplicate of this screen. Leave overflow, detail and mark null.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

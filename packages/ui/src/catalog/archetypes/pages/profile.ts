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
      "Choose one supplied record as the subject when none is named. Name that record in Header.title and Profile.name, not the entire collection. Use Profile to show the subject's supplied context, such as its room. Add one relevant Header.action only if it has a specific destination.",
      "Include the required Stats component, but never invent tiles. Extract a measurement explicitly stated for the subject whenever possible: for Fern's 'Water every seven days', use label 'Watering interval', value '7', unit 'days'. Use an empty tiles array only when no measurement is available.",
      "Use the List for other records in the collection or additional details. Exclude the featured record, keep each related record's supplied facts and link to its own destination if available. Leave overflow, detail and mark null.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

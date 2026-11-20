import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "journal",
  "Entries over time and room to write",
  {
    entries: "Header Card Button",
    photos: "Header Gallery Button",
    write: "Header Field:date Scale:mood Composer:entry Button",
  },
  {
    entries: [
      "A Card can have either an icon or a photo, never both. When using a photo, icon must be null; when using an icon, photo must be null. Use short entry summaries and a single clear Button for a new entry; do not add an unrelated confirmation.",
      "These are dated journal entries, not a catalog of objects. Show each supplied entry's title, date and actual summary in a Card, newest first. Photo and unused badge are null. Header action is null; the only new-entry action is the final Button navigating to new_entry.",
    ],
    photos: [
      "Name the subject and photo journal in the Header. Use the subtitle “Tap a photo to read its entry”. Header action and axes are null. The final Button says Write entry and goes to new_entry; its axes, kind, icon and confirm are null.",
      "Use each supplied photo with a distinct caption and a goto to its entry, such as entry_fern. When photos share a reference, use the record name and an exact, plain-language fact from the cast. With care intervals, use “Fern · every 7 days” within the 24-character limit, never abbreviate days to d. Leave Gallery axes null.",
    ],
    write: [
      "Name the task in Header.title, e.g. Write a journal entry, and show one short instruction in Header.sub about dating, rating and writing the entry. Leave Header axes and action null. Use one Save entry button that goes to the journal after saving; do not make it a navigation shortcut before the entry is saved.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

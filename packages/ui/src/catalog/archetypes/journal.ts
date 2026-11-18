import { createMeta, composeProbes } from "./recipe";
import type { ArchetypeMeta } from "./types";
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
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

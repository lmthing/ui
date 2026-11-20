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
      "Name the subject and photo journal in the Header. Its subtitle tells the person to open a photo to see the entry. Set Header action to literal null; never put a camera or New entry shortcut there. The final Button, labeled Write entry, is the only creation action and goes to new_entry.",
      "Use each supplied photo with a distinct caption and a goto to its entry. When photos share a reference, make their captions useful with the record name and a short supplied fact, such as its care interval. Keep the fact readable and the full caption within 24 characters; do not use a clipped word or invent a photo or date.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

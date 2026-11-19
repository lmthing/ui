import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "browse",
  "Explore shelves of things to open",
  { shelves: "Header Search Chips SectionTitle List:shelf SectionTitle List:shelf" },
  {
    shelves: [
      'Header names the collection; its action is literal null because Search already finds records by name. Chips filter by a supplied category. Use two Lists with style "shelf", and leave unrequested axes null. Each shelf needs at least two rows with a supplied photo and a goto to its record.',
      "Make the first shelf the full collection, with its supplied location or category in row meta. Make the second a two-record shortlist based on a useful supplied fact, such as the two shortest care intervals. Name that reason in the second heading and show the fact in those rows. If records overlap, use a different detail in the shortlist; do not repeat the full collection or invent recency or status.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "browse",
  "Explore shelves of things to open",
  { shelves: "Header Search Chips SectionTitle List:shelf SectionTitle List:shelf" },
  {
    shelves: [
      'Write two Lists with style "shelf". Each shelf needs at least two rows, each with its supplied photo and a goto to the record. An icon or lead value cannot replace a photo. If the records cannot fill two shelves separately, reuse supplied photo records rather than making a photo-less or single-row shelf.',
      "Give the shelves different jobs. For example, the first can help find records by location and the second can show their supplied care routines. Match each heading to that shelf's row meta; if a record appears twice, the second row must add a different supplied fact. Search and Chips help find records; do not use the second shelf for a copy of the first or invent recency or status.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

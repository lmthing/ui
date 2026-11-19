import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
export const meta = createMeta(
  "browse",
  "Explore shelves of things to open",
  { shelves: "Header Search Chips SectionTitle List:shelf SectionTitle List:shelf" },
  {
    shelves: [
      'Write two Lists with style "shelf". Each shelf needs at least two rows, each with its supplied photo and a goto to the record. An icon or lead value cannot replace a photo. If the records cannot fill two shelves separately, reuse supplied photo records rather than making a photo-less or single-row shelf.',
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

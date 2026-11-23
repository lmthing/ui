import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
const action =
  "Use a primary Button only for a specific requested task on this record. A read-only detail needs no Button. Never use the Button to go back.";
export const meta = createMeta(
  "detail",
  "One thing, fully",
  {
    facts: "Header KeyValue Note Button?",
    media: "Header Photo KeyValue Button?",
    progress: "Header Progress:ring KeyValue Button?",
  },
  {
    facts: [
      "Choose one supplied record and use its name as the Header title. KeyValue shows that record's actual fields, not facts about other records. The Note can explain a supplied fact such as a recurring care interval; it is not a generic sample-data disclaimer. A recurring interval does not mean the action is due today.",
      action,
    ],
    media: [
      "Use the record name in Header and its supplied image in Photo. Never substitute generic or invented imagery. If no usable image is supplied use the facts layout instead. KeyValue adds facts that are not in the caption. Do not add a Hero: the record name and image already lead.",
      action,
    ],
    progress: [
      "Use the project name in Header and one total-project measurement in Progress, not progress for a selected piece. Copy the completed amount, total, unit and any supplied due date; Progress calculates what remains. In KeyValue include the supplied next milestone and other useful facts, without repeating the figures. Do not add a Hero when Progress already leads.",
      "If the source has no progress measurement, use the facts layout in production. If this layout is mandated, leave Progress bars empty and use only the supplied record facts. Never count filled fields, invent progress or guess a deadline.",
      action,
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

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
      'If no completed amount and target are supplied, leave Progress.style "ring" with bars: [] and sub null. In the supplied plant sample, care intervals are schedules, not watering logs, and the number of plants is not progress. Show only Fern, with Header.title "Fern", contextual back, and its Room and Care schedule in KeyValue. Do not repeat its name in KeyValue or invent Add/Edit actions, a goal or a deadline.',
      action,
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

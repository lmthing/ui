import { variantAxes } from "../props";
import type { Axis } from "../types";

const meanings: Partial<Record<Axis, string>> = {
  bleed: "gutter",
  detail: "secondary text",
  media: "image",
  figures: "numbers",
  labels: "charts",
  lead: "row start",
  trail: "row end",
  tone: "status",
};

export const variantVocabulary = [
  "Set variants only as requested. Otherwise use null, not the default.",
  ...Object.entries(variantAxes).map(([axis, { values }]) => {
    const meaning = meanings[axis as Axis];
    return `${axis}${meaning ? ` (${meaning})` : ""}: ${values.join("|")}`;
  }),
].join("\n");

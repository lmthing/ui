import { variantAxes } from "../props";

export const variantVocabulary = [
  'Set shared axes, including item axes, only when explicitly requested; otherwise use null. At most one third of items per component get mark "highlight" (round down).',
  ...Object.entries(variantAxes).map(([axis, { values }]) => `${axis}: ${values.join("|")}`),
].join("\n");

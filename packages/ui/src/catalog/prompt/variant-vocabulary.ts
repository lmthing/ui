import { variantAxes } from "../props";

export const variantVocabulary = [
  'Set shared axes, including item axes, only when explicitly requested; otherwise use null. At most one third of items per component get mark "highlight" (round down).',
  ...Object.entries(variantAxes).map(([axis, { values }]) => `${axis}: ${values.join("|")}`),
].join("\n");

// Inlined from writer-variants.md for Node source imports and the data-only bundle.
export const writerVariants = `Start every shared variant on the component and its rows at JSON null. Set only the axes needed for the presentation the request calls for. An "=value" in the props list is a render default, not a value to output. Never copy a variant from an example. Leave emphasis null unless the request asks to change prominence, even if "normal" is listed.

Keep requested content visible. Leave detail null when the default already shows the requested content, or when there is no extra content to hide. Set detail only if the request asks to hide or reveal existing content and the default does not do that. Read-only changes actions, not visibility.`;

export const writerItemTone = `Before returning JSON, check every row: output "tone":null unless the brief asks for a status treatment that applies to that row. A measurement, a value below its target, or a request to abbreviate numbers does not ask for a warning. Never fill in a listed tone default.`;

export const composeFlow = `If a list explains a chart, show the corresponding details in chart order. For a grouped or filtered list, make instructions and action destinations clear enough to follow without guessing.`;

import { variantAxes } from "../props";

export const variantVocabulary = [
  'Set shared axes, including item axes, only when explicitly requested; otherwise use null. At most one third of items per component get mark "highlight" (round down).',
  ...Object.entries(variantAxes).map(([axis, { values }]) => `${axis}: ${values.join("|")}`),
].join("\n");

// Markdown source: writer-variants.md. Inlined for the data-only catalog and checked by a test.
export const writerVariants = `Start every shared variant on the component and its rows at JSON null. Set only the axes needed for the presentation the request calls for. An "=value" in the props list is a render default, not a value to output. Never copy a variant from an example. Leave emphasis null unless the request asks to change prominence, even if "normal" is listed.

Density changes spacing only. Use null to inherit app spacing unless the request asks for tighter or roomier spacing. Showing fewer rows, hiding details, and shortening text do not change spacing. If regular content fields already meet the request (for example, rows have only names and no detail text), leave presentation axes for that content at null. Use detail only to show or hide content that is present.`;

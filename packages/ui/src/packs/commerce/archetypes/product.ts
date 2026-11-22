import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const product = {
  id: "product",
  job: "Review one product for sale",
  defaultLayout: "simple",
  layouts: {
    simple: {
      writeHints: [
        'Scale must use style "stars" and readonly true. It is a displayed customer rating, not an interactive input.',
      ],
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Gallery"], required: true, variant: "carousel" },
        { allow: ["Product"], required: true },
        { allow: ["Scale"], required: true, variant: "stars" },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "g1", c: "Gallery", style: "carousel" },
        { id: "p1", c: "Product" },
        { id: "s1", c: "Scale", style: "stars", readonly: true },
      ],
    },
    variants: {
      writeHints: [
        'Scale must use style "stars" and readonly true. VariantPicker uses at only when an available option is selected.',
      ],
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Gallery"], required: true, variant: "carousel" },
        { allow: ["Product"], required: true },
        { allow: ["VariantPicker"], required: true },
        { allow: ["Scale"], required: true, variant: "stars" },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "g1", c: "Gallery", style: "carousel" },
        { id: "p1", c: "Product" },
        { id: "v1", c: "VariantPicker" },
        { id: "s1", c: "Scale", style: "stars", readonly: true },
      ],
    },
    sizing: {
      writeHints: [
        'Start with {"c":"Header","style":"back",…}. Set "style":"back" explicitly; a plain header does not provide the back action.',
        'SizeGuide columns are measurement names only, such as ["Chest","Sleeve"]. Put the size label in each row’s "size" field, not in columns. Give every row exactly one value per column, e.g. {"size":"Small","values":[36,24]}. Set the source unit once.',
        'Use VariantPicker with "style":"size" and one option per offered size. Mark each option’s availability.',
      ],
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["SizeGuide"], required: true },
        { allow: ["VariantPicker"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "s1", c: "SizeGuide" },
        { id: "v1", c: "VariantPicker" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "product",
    layout: "simple",
    brief: "See one product with its photos, price, stock, add control and read-only customer rating.",
  },
  {
    kind: "compose",
    archetype: "product",
    layout: "variants",
    brief:
      "See one product with its photos, stock and add control, choose its size, and show a read-only rating.",
  },
  {
    kind: "compose",
    archetype: "product",
    layout: "sizing",
    brief:
      "Compare a jacket's measurements by size in inches or centimetres before choosing an available size.",
  },
] satisfies ComposeProbe[];

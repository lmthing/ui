import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const unit = {
  id: "unit",
  job: "Review one unit, its occupants and utilities",
  defaultLayout: "property_unit_detail",
  layouts: {
    property_unit_detail: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Gallery"], required: true, variant: "carousel" },
        { allow: ["KeyValue"], required: true },
        { allow: ["Units"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "g1", c: "Gallery", style: "carousel" },
        { id: "k1", c: "KeyValue" },
        { id: "u1", c: "Units" },
      ],
    },
    property_unit_tenants: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["List"], required: true },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "l1", c: "List" },
        { id: "n1", c: "Note" },
        { id: "b1", c: "Button" },
      ],
    },
    property_unit_meters: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Meters"], required: true },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "m1", c: "Meters" },
        { id: "n1", c: "Note" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "unit",
    layout: "property_unit_detail",
    brief:
      "Show Willow Flat with a back heading, an explicitly carousel photo gallery with local:1 and local:2, key/value facts Address: 14 Mill Lane and Beds: 2, and a one-unit occupancy register for vacant flat_a on 2026-11-18.",
  },
  {
    kind: "compose",
    archetype: "unit",
    layout: "property_unit_tenants",
    brief:
      "Show a Tenants back heading, a plain directory list containing Asha linked to asha_profile, a note that these are occupants only, and an Add tenant button.",
  },
  {
    kind: "compose",
    archetype: "unit",
    layout: "property_unit_meters",
    brief:
      "Show a Willow utilities back heading, the flat_a meter register with electricity meter willow_electric in kWh and its two readings: willow_oct 1200 on 2026-10-18T08:00:00Z and willow_nov 1246 on 2026-11-18T08:00:00Z. Add via add_reading, include a note about manual readings and an Add reading button.",
  },
] satisfies ComposeProbe[];

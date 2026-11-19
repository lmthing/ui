import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const house = {
  id: "house",
  job: "The house's devices and scenes",
  defaultLayout: "rooms",
  layouts: {
    rooms: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["Devices"], required: true, variant: "tiles" },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented" },
        { id: "d1", c: "Devices", style: "tiles" },
        { id: "n1", c: "Note" },
      ],
    },
    home_control: {
      writeHints: [
        "Use focused style with focus naming an existing heat or sensor device, or omit focus to use the first device. No standalone slider preference replaces the connected device.",
      ],
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Devices"], required: true, variant: "focused" },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "d1", c: "Devices", style: "focused" },
        { id: "n1", c: "Note" },
      ],
    },
    home_scenes: {
      writeHints: [
        "Keep saved scenes on Devices in tiles style, above the rooms. With an empty cast an empty scenes seed is valid; do not invent device references or claim commands succeeded.",
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Devices"], required: true, variant: "tiles" },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "d1", c: "Devices", style: "tiles" },
        { id: "n1", c: "Note" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;
export const probes = [
  {
    kind: "compose",
    archetype: "house",
    layout: "rooms",
    brief: "Room-grouped connected devices and a clearly labelled service mock",
  },
  {
    kind: "compose",
    archetype: "house",
    layout: "home_control",
    brief: "A focused thermostat with measured temperature beside its set point",
  },
  {
    kind: "compose",
    archetype: "house",
    layout: "home_scenes",
    brief: "Saved household scenes above the room devices, with lock scenes confirmed",
  },
] satisfies ComposeProbe[];

import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const house = {
  id: "house",
  job: "The house's devices and scenes",
  defaultLayout: "rooms",
  layouts: {
    rooms: {
      writeHints: [
        "With an empty cast use the valid neutral device fallback. Do not fake an empty sensor with on/level/temp; sensors are read-only with reading and unit, never switch settings. Show empty state in host state, not invalid device props.",
      ],
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
        "Use focused style with focus naming an existing device key, or omit focus to use the first device. No standalone slider preference replaces the connected device. Every scene target follows its referenced device's capabilities: blind targets have on:null and temp:null, only level; heat targets have level:null; sensors cannot be targets.",
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

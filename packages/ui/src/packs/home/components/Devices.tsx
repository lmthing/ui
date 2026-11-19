import { z } from "zod";
import {
  itemsOf,
  placeholderTitle,
  probesFor,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";
import { deviceProps, readDevices } from "..";

// Core first: Field/slider stores a preference, not live device commands, readings or scenes.
export const meta = {
  id: "Devices",
  status: "draft",
  group: "input",
  purpose: "Read and control household devices by room, with thermostat, sensor and saved scene options.",
  pick: "Connected household devices: switches, thermostat reading and set point, sensor ranges and multi-device scenes. Not stored app preferences (Field, List), navigation shortcuts (Actions), manual measurements (Stats, Sparkline), or a person's body readings (Vitals).",
  writeHints: [
    "Use unique keys across all rooms. Switches and heat require on; lock on:true means locked. Heat requires temp 5–30 °C; reading is optional. Light/fan/blind may have level 0–100. Blind and sensor never have on.",
    "Sensors require reading and unit (celsius, percent, ppm, lux), optionally normal:{low,high} with low<=high; no commands. Reading is only for heat/sensor, unit/normal only for sensor.",
    "Scenes default to []. Each has 2–6 distinct device targets, with key and at least one supported absolute on/level/temp setting. Never target sensors or unknown keys. focus must name a device.",
    "Never write active-scene, out-of-range, pending or command-outcome flags. Code chooses apply versus secure from lock targets. Lock changes and lock scenes always confirm.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "service",
  realPath:
    "A host adapter maps device keys to a smart-home service, supplies readings and command acknowledgements; without it this is a labelled mock.",
  items: {
    key: "entries",
    parts: [
      "root",
      "name",
      "room",
      "reading",
      "level",
      "temp",
      "minus",
      "plus",
      "lock",
      "controls",
      "apply",
      "secure",
    ],
  },
  parts: ["root"],
  confirmParts: ["lock", "secure"],
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    items: {
      root: ["toggle"],
      lock: ["toggle"],
      controls: ["press"],
      level: ["set"],
      temp: ["set"],
      minus: ["decrement"],
      plus: ["increment"],
      apply: ["press"],
      secure: ["press"],
    },
    when: {
      root: { entryKind: "device", switchable: true },
      lock: { kind: "lock" },
      controls: { entryKind: "device", linked: true },
      level: { entryKind: "device", adjustable: true },
      temp: { kind: "heat" },
      minus: { kind: "heat" },
      plus: { kind: "heat" },
      apply: { entryKind: "scene", secure: false },
      secure: { entryKind: "scene", secure: true },
    },
  },
  read: readDevices,
} as const satisfies Meta;
export const props = deviceProps;
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast),
    items = itemsOf(cast, 6);
  return {
    rooms: [
      {
        label: placeholderTitle(0),
        devices: (items.length ? items : [undefined]).map((item, index) => ({
          key: `device_${index + 1}`,
          name: item ? (titleOf(item, 16, thing) ?? placeholderTitle(index)) : placeholderTitle(index),
          kind: "light",
          on: false,
        })),
      },
    ],
    scenes: [],
    style: "tiles",
  };
}
export const examples = [
  {
    rooms: [
      {
        label: "Living room",
        devices: [
          {
            key: "heat",
            name: "Thermostat",
            kind: "heat",
            on: true,
            temp: 21,
            reading: 20.5,
            goto: "heating",
          },
          {
            key: "humidity",
            name: "Humidity",
            kind: "sensor",
            reading: 45,
            unit: "percent",
            normal: { low: 40, high: 60 },
          },
          { key: "lamp", name: "Plant lamp", kind: "light", on: true, level: 70 },
        ],
      },
    ],
    focus: "heat",
    style: "focused",
    scenes: [
      {
        name: "Evening",
        targets: [
          { key: "lamp", on: true, level: 40 },
          { key: "heat", temp: 20 },
        ],
      },
    ],
  },
  {
    rooms: [
      {
        label: "Hall",
        devices: [
          { key: "light", name: "Hall light", kind: "light", on: false, level: 25 },
          { key: "door", name: "Front door", kind: "lock", on: true },
          { key: "fan", name: "Dog room fan", kind: "fan", on: true, level: 50 },
          { key: "blind", name: "Window blind", kind: "blind", level: 80 },
          { key: "plug", name: "Water fountain", kind: "plug", on: true },
          { key: "air", name: "Air quality", kind: "sensor", reading: 800, unit: "ppm" },
        ],
      },
    ],
    style: "tiles",
    scenes: [
      {
        name: "Home time",
        targets: [
          { key: "light", on: true },
          { key: "fan", level: 20 },
        ],
      },
      {
        name: "Leave for a walk",
        targets: [
          { key: "light", on: false },
          { key: "door", on: true },
        ],
      },
    ],
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Devices");
export const probes = [
  choose(
    "Connected room thermostat controls beside its live temperature, a humidity sensor's normal range, and saved scenes changing lights and heat",
  ),
  choose(
    "Store my preferred temperature as one slider on a settings form; no connected hardware or live reading",
    "Field",
  ),
  choose(
    "Three buttons navigate to my app's settings, history and help screens, without device commands",
    "Actions",
  ),
  choose("A local app preference shown as one settings row with a toggle, not connected to hardware", "List"),
  choose(
    "Show the manually recorded count of indoor humidity readings as a summary number, no live device or commands",
    "Stats",
  ),
  write(
    "Living room has thermostat key heat, on, set to 21 Celsius, measured 20.5; humidity sensor key humidity reads 45 percent with normal range 40 to 60; light key lamp on at level 70. Focus heat. Evening scene sets lamp to on at 40 and heat to 20.",
  ),
  read("Increase the thermostat's set point by one step", { address: "d1/r1/plus", action: "increment" }),
  read("Apply the Evening scene", { address: "d1/r4/apply", action: "press" }),
  read("Change the front door lock", { address: "d1/r2/lock", action: "toggle" }, 1),
  read("Apply Leave for a walk, which changes the lock", { address: "d1/r8/secure", action: "press" }, 1),
] satisfies Probe[];

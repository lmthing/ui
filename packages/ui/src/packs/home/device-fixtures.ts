import type { z } from "zod";
import {
  itemsOf,
  placeholderTitle,
  probesFor,
  thingOf,
  titleOf,
  type FallbackInput,
  type Probe,
} from "../../catalog";
import type { deviceProps } from ".";
import { prompt } from "../../entry/prompt-Devices.generated";

export const deviceWriteHints = prompt.writeHints;

const fanAndLamp = {
  rooms: [
    { label: "Hall", devices: [{ key: "fan", name: "Hall fan", kind: "fan", on: true }] },
    { label: "Kitchen", devices: [{ key: "lamp", name: "Plant lamp", kind: "light", on: false }] },
  ],
} satisfies z.input<typeof deviceProps>;
export const deviceExamples = [
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
  fanAndLamp,
  { ...fanAndLamp, group: "none" },
  {
    style: "focused",
    rooms: [
      {
        label: "Greenhouse",
        devices: [
          {
            key: "heat",
            name: "Thermostat",
            kind: "heat",
            on: true,
            temp: 20,
            reading: 22,
            mode: "auto",
            coolTemp: 25,
          },
        ],
      },
    ],
  },
] satisfies z.input<typeof deviceProps>[];
const { choose, write, read } = probesFor("Devices");
export const deviceProbes = [
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
  choose(
    "Show a scannable settings list for this app's local preferences: Email reminders, Weekly digest and App sounds, each in its own row with a switch at the right. This is not a form.",
    "List",
  ),
  choose(
    "Show two independent manual summary measurements together: number of indoor humidity readings and average humidity. No comparison across days or categories, recent chart, live device or commands",
    "Stats",
  ),
  write(
    "Living room has thermostat key heat, on, set to 21 Celsius, measured 20.5; humidity sensor key humidity reads 45 percent with normal range 40 to 60; light key lamp on at level 70. Focus heat. Evening scene sets lamp to on at 40 and heat to 20.",
  ),
  {
    ...write(
      "The hall fan is on and the kitchen lamp is off. Show the connected devices in one list without room headings.",
    ),
    variant: { axis: "group", value: "none" },
  },
  {
    ...write(
      "One hall thermostat, switched on with a heating set point of 20 °C. Its operating mode is auto.",
    ),
    expectProps: { rooms: [{ devices: [{ mode: "auto" }] }] },
  },
  {
    ...write(
      "One hall thermostat, switched on. Its heating set point is 20 °C and its separate cooling set point is 25.5 °C.",
    ),
    expectProps: { rooms: [{ devices: [{ coolTemp: 25.5, temp: 20 }] }] },
  },
  read("Increase the thermostat's set point by one step", { address: "d1/r1/plus", action: "increment" }),
  read("Apply the Evening scene", { address: "d1/r4/apply", action: "press" }),
  read("Change the front door lock", { address: "d1/r2/lock", action: "toggle" }, 1),
  read("Apply Leave for a walk, which changes the lock", { address: "d1/r8/secure", action: "press" }, 1),
] satisfies Probe[];

export function deviceFallback({ cast, lang }: FallbackInput): z.input<typeof deviceProps> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 6);
  return {
    rooms: [
      {
        label: placeholderTitle(0, lang),
        devices: (items.length ? items : [undefined]).map((item, index) => ({
          key: `device_${index + 1}`,
          name: (item && titleOf(item, 16, thing)) ?? placeholderTitle(index, lang),
          kind: "light",
          on: false,
        })),
      },
    ],
    scenes: [],
  };
}

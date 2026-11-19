import { expect, it } from "vitest";
import { components, readComponent } from "@lmthing/ui/catalog";
import { deviceLabels } from "../copy";
import { deviceProps } from "..";

const heat = { key: "heat", name: "Thermostat", kind: "heat", on: true, temp: 21 };
const light = { key: "light", name: "Light", kind: "light", on: true };
const sensor = { key: "sensor", name: "Humidity", kind: "sensor", reading: 45, unit: "percent" };
const input = (devices: unknown[]) => ({ rooms: [{ label: "Room", devices }] });
const scene = (targets: unknown[]) => ({
  ...input([heat, light, sensor]),
  scenes: [{ name: "Evening", targets }],
});

it("rejects unsupported device fields, missing readings and invalid ranges", () => {
  const invalid = [
    { ...heat, temp: 4.5 },
    { ...heat, temp: 30.5 },
    { ...heat, temp: undefined },
    { ...heat, on: undefined },
    { ...heat, unit: "celsius" },
    { ...heat, level: 25 },
    { ...light, temp: 21 },
    { ...light, reading: 20 },
    { ...light, level: -1 },
    { ...light, level: 101 },
    { ...light, key: "x".repeat(25) },
    { ...light, name: "x".repeat(17) },
    { ...sensor, reading: undefined },
    { ...sensor, unit: undefined },
    { ...sensor, unit: "fahrenheit" },
    { ...sensor, on: false },
    { ...sensor, normal: { low: 50, high: 40 } },
    { ...sensor, normal: { low: 40, high: 60, warning: true } },
    { ...light, photo: "https://example.org/p.png" },
    { ...light, outcome: "success" },
    { key: "blind", name: "Blind", kind: "blind", on: false },
  ];
  for (const row of invalid) expect(deviceProps.safeParse(input([row])).success).toBe(false);
  expect(deviceProps.safeParse(input([heat, { ...light, key: "heat" }])).success).toBe(false);
  expect(deviceProps.safeParse({ ...input([heat]), focus: "missing" }).success).toBe(false);
  expect(deviceProps.safeParse({ ...input([heat]), entries: [] }).success).toBe(false);
});

it("rejects unknown, repeated, sensor and unsupported scene targets", () => {
  for (const targets of [
    [{ key: "heat", temp: 21 }],
    [
      { key: "heat", temp: 21 },
      { key: "heat", on: true },
    ],
    [
      { key: "heat", temp: 21 },
      { key: "missing", on: true },
    ],
    [
      { key: "heat", temp: 21 },
      { key: "sensor", on: true },
    ],
    [
      { key: "heat", level: 25 },
      { key: "light", on: true },
    ],
    [
      { key: "heat", temp: 31 },
      { key: "light", on: true },
    ],
    [{ key: "heat" }, { key: "light", on: true }],
    [
      { key: "heat", temp: 21 },
      { key: "light", temp: 21 },
    ],
  ])
    expect(deviceProps.safeParse(scene(targets)).success).toBe(false);
  expect(
    deviceProps.safeParse(
      scene([
        { key: "heat", temp: 5 },
        { key: "light", level: 100 },
      ]),
    ).success,
  ).toBe(true);
});

it("accepts exact device, room, scene and numeric boundaries without model-owned derived flags", () => {
  const devices = Array.from({ length: 6 }, (_, index) => ({
    ...light,
    key: `light_${index}`,
    level: index ? 100 : 0,
  }));
  const rooms = Array.from({ length: 4 }, (_, index) => ({
    label: "x".repeat(16),
    devices: devices.map((row) => ({ ...row, key: `${row.key}_${index}` })),
  }));
  const scenes = Array.from({ length: 6 }, () => ({
    name: "x".repeat(24),
    targets: devices.map((row) => ({ key: `${row.key}_0`, on: false })),
  }));
  expect(deviceProps.safeParse({ rooms, scenes }).success).toBe(true);
  expect(deviceProps.safeParse({ rooms: [...rooms, rooms[0]], scenes }).success).toBe(false);
  expect(deviceProps.safeParse({ rooms, scenes: [...scenes, scenes[0]] }).success).toBe(false);
  expect(deviceProps.safeParse(input([...devices, { ...light, key: "seventh" }])).success).toBe(false);
  for (const temp of [5, 30]) expect(deviceProps.safeParse(input([{ ...heat, temp }])).success).toBe(true);
  for (const reading of [40, 60]) {
    const text = readComponent(
      components.Devices,
      input([{ ...sensor, reading, normal: { low: 40, high: 60 } }]),
      "d1",
    ).join("\n");
    expect(text).not.toContain(deviceLabels.outOfRange);
    expect(text).not.toContain(" toggle");
  }
  for (const reading of [39.9, 60.1])
    expect(
      readComponent(
        components.Devices,
        input([{ ...sensor, reading, normal: { low: 40, high: 60 } }]),
        "d1",
      ).join("\n"),
    ).toContain(deviceLabels.outOfRange);
});

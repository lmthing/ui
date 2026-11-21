import { expect, it } from "vitest";
import { components, readComponent } from "@lmthing/ui/catalog";
import { addressedElements, elementAt, renderInstance } from "../../../../../test/render";

const { CareSchedule, Devices } = components;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const task = CareSchedule.examples[0]!.tasks[0]!;
const heat = { key: "heat", name: "Thermostat", kind: "heat", on: true, temp: 21 };
const room = (...devices: unknown[]) => ({ rooms: [{ label: "Hall", devices }] });
const textAt = (html: string, address: string) => addressedElements(html).get(address)?.text;

it.each([
  ["pet", "Pet care", "grid"],
  ["plant", "Plant care", "grid"],
  ["car", "Car care", "rows"],
  ["house", "House care", "rows"],
] as const)("draws and reads %s (%s) only for its task in %s", (category, label, arrange) => {
  const input = { tasks: [{ ...task, category }, task], arrange };
  expect(CareSchedule.props.safeParse(input).success).toBe(true);
  const html = renderInstance("CareSchedule", input, "filled", theme);
  expect(textAt(html, "home/c1/r1/category")).toEqual([label]);
  expect(html).not.toContain("home/c1/r2/category");
  const read = readComponent(CareSchedule, input, "c1");
  expect(read.filter((line) => line.includes(label))).toHaveLength(1);
  expect(read.join("\n")).toContain("[c1/r1/done press]");
  expect(read.join("\n")).not.toContain("/category press");
});

it("rejects an unknown task category and leaves fallback tasks uncategorized", () => {
  expect(CareSchedule.props.safeParse({ tasks: [{ ...task, category: "other" }] }).success).toBe(false);
  const fallback = CareSchedule.props.parse(CareSchedule.fallback({ cast: { things: [], items: [] } }));
  expect(fallback.tasks[0]).not.toHaveProperty("category");
});

it.each([
  [heat, { mode: "fan_only" }],
  [heat, { coolTemp: 4.9 }],
  [heat, { coolTemp: 30.1 }],
  [heat, { coolTemp: "25" }],
  [{ key: "lamp", kind: "light", name: "Lamp", on: true }, { mode: "off" }],
  [{ key: "air", kind: "sensor", name: "Air", reading: 22, unit: "celsius" }, { coolTemp: 25 }],
])("rejects invalid or unsupported thermostat fields", (row, fields) => {
  expect(Devices.props.safeParse(room({ ...row, ...fields })).success).toBe(false);
});

it.each([
  ["heat", "Heat", 5],
  ["cool", "Cool", 25.5],
  ["auto", "Auto", 30],
  ["off", "Off", undefined],
] as const)("renders %s without introducing new device commands", (mode, label, coolTemp) => {
  const input = room({ ...heat, mode, coolTemp });
  const parsed = Devices.props.parse(input);
  expect(parsed.entries[0]).toMatchObject({ mode, coolTemp });
  const html = renderInstance("Devices", input, "filled", theme);
  expect(textAt(html, "home/c1/r1/mode")).toEqual([`Mode: ${label}`]);
  const read = readComponent(Devices, input, "d1").join("\n");
  expect(read).toContain(`Mode: ${label}`);
  expect(read).toContain("Heating set point 21 °C");
  expect(read).toContain("[d1/r1/plus increment");
  expect(read).not.toMatch(/\[d1\/r1\/(?:mode|cool_temp)\b/);
  if (coolTemp === undefined) expect(html).not.toContain("home/c1/r1/cool_temp");
  else {
    const cooling = `Cooling set point: ${coolTemp} °C`;
    expect(html).toContain("Cool target · °C");
    expect(html).toContain("Adjust heat target");
    expect(elementAt(html, "home/c1/r1/minus").attributes).toContain(
      'aria-label="Decrease heating set point"',
    );
    expect(elementAt(html, "home/c1/r1/plus").attributes).toContain(
      'aria-label="Increase heating set point"',
    );
    expect(textAt(html, "home/c1/r1/cool_temp")).toEqual([String(coolTemp)]);
    expect(read).toContain(cooling);
  }
});

it("renders cooling without mode and preserves existing output when neither is supplied", () => {
  const input = room({ ...heat, coolTemp: 25 });
  const html = renderInstance("Devices", { ...input, style: "focused" }, "filled", theme);
  expect(html).toContain("Cool target · °C");
  expect(textAt(html, "home/c1/r1/cool_temp")).toEqual(["25"]);
  expect(html).not.toContain("home/c1/r1/mode");
  const old = renderInstance("Devices", room(heat), "filled", theme);
  expect(old).toContain("Set point · °C");
  expect(elementAt(old, "home/c1/r1/plus").attributes).toContain('aria-label="Increase set point"');
  expect(old).not.toMatch(/home\/c1\/r1\/(?:mode|cool_temp)/);
  expect(readComponent(Devices, room(heat), "d1").join("\n")).toContain("Set point 21 °C");
});

it("keeps the new thermostat values readable offline without enabling the old controls", () => {
  const html = renderInstance("Devices", room({ ...heat, mode: "auto", coolTemp: 25 }), "error", theme);
  expect(textAt(html, "home/c1/r1/mode")).toEqual(["Mode: Auto"]);
  expect(textAt(html, "home/c1/r1/cool_temp")).toEqual(["25"]);
  expect(elementAt(html, "home/c1/r1/temp").attributes).toContain('aria-disabled="true"');
});

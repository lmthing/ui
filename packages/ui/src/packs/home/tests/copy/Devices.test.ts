import { expect, it } from "vitest";
import { components } from "@lmthing/ui/catalog";
import {
  deviceLabels,
  deviceRange,
  deviceUnits,
  deviceValue,
  focusedDevice,
  thermostatCopy,
} from "../../copy";

it("keeps device values, range warnings, lock confirmations and canonical units unchanged", () => {
  expect(deviceLabels).toEqual({
    reading: "Reading",
    setPoint: "Set point",
    normal: "Normal range",
    outOfRange: "Outside normal range",
    apply: "Apply scene",
    secure: "Apply scene, asks first",
    locked: "Locked",
    unlocked: "Unlocked",
  });
  expect(deviceUnits).toEqual({ celsius: "°C", percent: "%", ppm: "ppm", lux: "lux" });
});

const { props, examples } = components.Devices;
const devices = props.parse(examples[0]).entries.filter((row) => row.entryKind === "device");
const humidity = devices.find((row) => row.kind === "sensor")!;

it("formats readings for the requested locale without changing the stored value", () => {
  expect(deviceValue(20.5, "celsius", "de-DE")).toBe("20,5 °C");
  expect(deviceValue(20.5, "celsius", "en")).toBe("20.5 °C");
});

it("uses the old set-point label only without the new fields and localizes cooling values", () => {
  expect(thermostatCopy({})).toMatchObject({ setPoint: "Set point", mode: undefined, coolTemp: undefined });
  expect(thermostatCopy({ mode: "auto", coolTemp: 25.5 }, "de-DE")).toEqual({
    setPoint: "Heating set point",
    heatingCaption: "Heat target",
    coolingCaption: "Cool target",
    mode: "Mode: Auto",
    coolTemp: "Cooling set point: 25,5 °C",
  });
});

it("includes boundary readings in the normal band and distinguishes an outlier", () => {
  expect(deviceRange({ ...humidity, reading: 40 })).toMatchObject({ label: "40–60 %", outside: false });
  expect(deviceRange({ ...humidity, reading: 60 })).toMatchObject({ outside: false });
  expect(deviceRange({ ...humidity, reading: 93 })).toMatchObject({
    value: 93,
    max: 93,
    outside: true,
    status: deviceLabels.outOfRange,
  });
  expect(deviceRange({ ...humidity, normal: undefined })).toBeUndefined();
});

it("resolves an explicit focus or defaults to the first device", () => {
  expect(focusedDevice(devices, humidity.key)).toBe(humidity);
  expect(focusedDevice(devices)).toBe(devices[0]);
  expect(focusedDevice([])).toBeUndefined();
});

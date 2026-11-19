import { z } from "zod";
import { screenId, text } from "../../catalog";

const switchKinds = ["light", "heat", "plug", "lock", "fan"];
const levelKinds = ["light", "fan", "blind"];
const deviceKey = z.string().trim().min(1).max(24);
const thermostatBounds = { min: 5, max: 30 } as const;
export const thermostatAdjust = {
  "minus.decrement": { prop: "temp", delta: -0.5, ...thermostatBounds },
  "plus.increment": { prop: "temp", delta: 0.5, ...thermostatBounds },
} as const;
const settings = {
  on: z.boolean().optional(),
  level: z.number().min(0).max(100).optional(),
  temp: z.number().min(thermostatBounds.min).max(thermostatBounds.max).optional(),
};
const device = z
  .strictObject({
    key: deviceKey,
    name: text(16),
    kind: z.enum(["light", "heat", "plug", "lock", "fan", "blind", "sensor"]),
    ...settings,
    reading: z.number().optional(),
    unit: z.enum(["celsius", "percent", "ppm", "lux"]).optional(),
    normal: z.strictObject({ low: z.number(), high: z.number() }).optional(),
    goto: screenId.optional(),
  })
  .refine(
    (row) =>
      (row.on === undefined ? !switchKinds.includes(row.kind) : switchKinds.includes(row.kind)) &&
      (row.level === undefined || levelKinds.includes(row.kind)) &&
      (row.kind === "heat" ? row.temp !== undefined : row.temp === undefined) &&
      (row.reading === undefined ? row.kind !== "sensor" : ["heat", "sensor"].includes(row.kind)) &&
      (row.kind === "sensor" ? row.unit !== undefined : row.unit === undefined) &&
      (row.normal === undefined || (row.kind === "sensor" && row.normal.low <= row.normal.high)),
    "Settings and readings must match the device kind; sensor readings/units and heat set points are required",
  );
const target = z
  .strictObject({ key: deviceKey, ...settings })
  .refine(
    (row) => row.on !== undefined || row.level !== undefined || row.temp !== undefined,
    "A scene target must set at least one value",
  );

/** Bounded model-written device data; addressed rows and capabilities are code-owned. */
export const deviceProps = z
  .strictObject({
    rooms: z
      .array(
        z.strictObject({
          label: text(16),
          devices: z.array(device).min(1).max(6),
        }),
      )
      .min(1)
      .max(4),
    scenes: z
      .array(
        z.strictObject({
          name: text(24),
          targets: z.array(target).min(2).max(6),
        }),
      )
      .min(0)
      .max(6)
      .default([]),
    focus: deviceKey.optional(),
    style: z.enum(["tiles", "focused"]).default("tiles"),
  })
  .refine(({ rooms, scenes, focus }) => {
    const devices = rooms.flatMap((room) => room.devices);
    const keys = new Map(devices.map((row) => [row.key, row]));
    return (
      keys.size === devices.length &&
      (focus === undefined || keys.has(focus)) &&
      scenes.every(
        (scene) =>
          new Set(scene.targets.map((row) => row.key)).size === scene.targets.length &&
          scene.targets.every((row) => {
            const targetDevice = keys.get(row.key);
            return (
              targetDevice !== undefined &&
              targetDevice.kind !== "sensor" &&
              (row.on === undefined || switchKinds.includes(targetDevice.kind)) &&
              (row.level === undefined || levelKinds.includes(targetDevice.kind)) &&
              (row.temp === undefined || targetDevice.kind === "heat")
            );
          }),
      )
    );
  }, "Device keys must be unique; focus and distinct scene targets must reference supported devices")
  .overwrite((value) => {
    const devices = value.rooms.flatMap((room) =>
      room.devices.map((row) => ({
        ...row,
        room: room.label,
        entryKind: "device",
        switchable: ["light", "heat", "plug", "fan"].includes(row.kind),
        adjustable: levelKinds.includes(row.kind),
        linked: row.goto !== undefined,
      })),
    );
    return {
      ...value,
      entries: [
        ...devices,
        ...value.scenes.map((scene) => ({
          ...scene,
          entryKind: "scene",
          secure: scene.targets.some((row) => devices.find((item) => item.key === row.key)?.kind === "lock"),
        })),
      ],
    };
  });

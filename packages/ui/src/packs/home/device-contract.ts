import { z } from "zod";
import { screenId, text, variantProps } from "../../catalog";
import { prompt } from "../../entry/prompt-Devices.generated";

const variants = { group: ["sections", "none"] } as const;

const switchKinds = ["light", "heat", "plug", "lock", "fan"];
const levelKinds = ["light", "fan", "blind"];
const deviceKey = z.string().trim().min(1).max(24);
export const thermostatBounds = { min: 5, max: 30 } as const;
const thermostatTemp = z.number().min(thermostatBounds.min).max(thermostatBounds.max);
const settings = {
  on: z.boolean().optional(),
  level: z.number().min(0).max(100).optional(),
  temp: thermostatTemp.optional(),
};
const device = z
  .strictObject({
    key: deviceKey,
    name: text(16),
    kind: z.enum(["light", "heat", "plug", "lock", "fan", "blind", "sensor"]),
    ...settings,
    mode: z.enum(["heat", "cool", "auto", "off"]).optional(),
    coolTemp: thermostatTemp.optional(),
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
      (row.kind === "heat" || (row.mode === undefined && row.coolTemp === undefined)) &&
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
const schema = z
  .strictObject({
    ...variantProps(variants),
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
    style: z.literal("focused").optional(),
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
  }, "Device keys must be unique; focus and distinct scene targets must reference supported devices");

function withEntries(value: z.output<typeof schema>) {
  const devices = value.rooms.flatMap((room, roomIndex) =>
    room.devices.map((row) => ({
      ...row,
      level: row.level,
      room: room.label,
      roomIndex,
      entryKind: "device" as const,
      switchable: row.kind !== "lock" && switchKinds.includes(row.kind),
      adjustable: levelKinds.includes(row.kind),
      linked: row.goto !== undefined,
    })),
  );
  const lockedKeys = new Set(devices.filter((row) => row.kind === "lock").map((row) => row.key));
  return {
    ...value,
    entries: [
      ...devices,
      ...value.scenes.map((scene) => ({
        ...scene,
        entryKind: "scene" as const,
        secure: scene.targets.some(({ key }) => lockedKeys.has(key)),
      })),
    ],
  };
}

export const deviceProps = schema.overwrite(withEntries) as typeof schema &
  z.ZodType<ReturnType<typeof withEntries>, z.input<typeof schema>>;

export type DeviceEntry = Extract<ReturnType<typeof withEntries>["entries"][number], { entryKind: "device" }>;

const deviceParts = [
  "root",
  "name",
  "room",
  "reading",
  "level",
  "temp",
  "mode",
  "cool_temp",
  "minus",
  "plus",
  "lock",
  "controls",
  "apply",
  "secure",
] as const;

const deviceActions = {
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
} as const;

export const deviceControls = {
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  region: "body",
  weight: 3,
  dense: true,
  tier: "service",
  variants,
  variantParts: { "group.none": { hides: ["room"] } },
  realPath:
    "A host adapter maps device keys to a smart-home service, supplies readings and command acknowledgements; without it this is a labelled mock.",
  items: {
    key: "entries",
    set: { temp: { prop: "temp", min: 5, max: 30 } },
    adjust: {
      "plus.increment": { prop: "temp", delta: 0.5 },
      "minus.decrement": { prop: "temp", delta: -0.5 },
    },
    parts: deviceParts,
  },
  parts: ["root"],
  confirmParts: ["lock", "secure"],
  states: ["filled", "empty", "loading", "success", "error"],
  actions: deviceActions,
} as const;

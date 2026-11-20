import { z } from "zod";
import * as c from "../../../catalog";
import { dateTime, distinct, ref, seedLabels } from "../seeds";

// Core first: Field/number cannot validate cumulative readings or derive consumption over each meter's history.
export const meta = {
  id: "Meters",
  status: "draft",
  group: "input",
  purpose: "Record cumulative utility readings and compare usage between readings for each meter.",
  pick: "Cumulative utility meter readings and computed consumption between dated readings by meter. Not entering one number (Field), a short trend (Sparkline), body measurements (Measurements), or smart device controls (Devices).",
  writeHints: [
    "Use snake_case refs. Each reading points to a meter in this line; no duplicate instants or decreasing values on the same meter. A replacement or reset requires a different meterRef.",
    'Write cumulative values (not differences or estimated bills), offset datetimes and an addGoto. Use "history" for interval readings, otherwise the meter register.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Manual meter series live on the device, without a smart-meter service or bill calculation.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root", "add"],
  items: { key: "entries", parts: ["root", "title", "latest", "previous", "at", "value", "usage", "photo"] },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    parts: { add: ["press"] },
    items: { root: ["select"], photo: ["press"] },
    when: {
      root: { entryKind: "meter" },
      photo: { entryKind: "reading", style: "history", visible: true, hasPhoto: true },
    },
  },
  select: { prop: "meterRef", value: { field: "meterRef" } },
  emptyActions: ["add.press"],
  read: (input, _state, lang): string[] => {
    const { meters, readings, style, meterRef } = input as z.output<typeof props> & { meterRef?: string };
    const selected = meterRef ?? meters[0]!.meterRef;
    return meters.flatMap((meter, index) => {
      const series = meterSeries(readings, meter.meterRef);
      const latest = series.at(-1),
        previous = series.at(-2);
      const number = (value: number) => `${c.numberLine(value, lang)} ${meter.unit}`;
      return [
        [
          `r${index + 1}`,
          meter.title,
          latest && number(latest.value),
          previous &&
            `${number(previous.value)} → ${number(latest!.value)} (+${number(latest!.value - previous.value)})`,
        ]
          .filter(Boolean)
          .join(" · "),
        ...(style === "history" && meter.meterRef === selected
          ? series.map(
              ({ at, value }, i) =>
                `${at} · ${number(value)}${i ? ` (+${number(value - series[i - 1]!.value)})` : ""}`,
            )
          : []),
      ];
    });
  },
} as const satisfies c.Meta;

const meter = z.strictObject({
  meterRef: ref,
  title: c.text(32),
  utility: z.enum(["electricity", "gas", "water"]),
  unit: z.enum(["kWh", "m3", "litre"]),
});
const reading = z.strictObject({
  readingRef: ref,
  meterRef: ref,
  at: dateTime,
  value: z.number().nonnegative(),
  photo: c.photo.optional(),
});

type Reading = z.output<typeof reading>;
function meterSeries(readings: readonly Reading[], meterRef: string) {
  return readings
    .filter((reading) => reading.meterRef === meterRef)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

function validSeries(series: readonly Reading[]) {
  return (
    distinct(series, ({ at }) => Date.parse(at)) &&
    series.every(
      (reading, index) =>
        Date.parse(reading.at) <= Date.now() && (index === 0 || reading.value >= series[index - 1]!.value),
    )
  );
}

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    unitRef: ref,
    meters: z.array(meter).min(1).max(6),
    readings: z.array(reading).min(0).max(24),
    addGoto: c.screenId,
    style: z.enum(["register", "history"]).default("register"),
  })
  .refine(({ meters }) => distinct(meters, ({ meterRef }) => meterRef), { path: ["meters"] })
  .refine(
    ({ meters, readings }) =>
      distinct(readings, ({ readingRef }) => readingRef) &&
      readings.every((reading) => meters.some((meter) => meter.meterRef === reading.meterRef)) &&
      meters.every(({ meterRef }) => validSeries(meterSeries(readings, meterRef))),
    {
      path: ["readings"],
      message: "Use known meters, distinct past instants and nondecreasing readings",
    },
  )
  .overwrite((value) => ({
    ...value,
    add: { goto: value.addGoto },
    entries: [
      ...value.meters.map((meter) => ({ ...meter, entryKind: "meter" })),
      ...value.readings.map((reading) => ({
        ...reading,
        entryKind: "reading",
        visible: reading.meterRef === value.meters[0]!.meterRef,
        hasPhoto: Boolean(reading.photo),
      })),
    ],
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const { ref, title } = seedLabels(input)[0]!;
  return {
    unitRef: ref,
    meters: [{ meterRef: `${ref}_meter`, title, utility: "electricity", unit: "kWh" }],
    readings: [],
    addGoto: "details",
  };
}

// prettier-ignore
export const examples = [
  { unitRef: "flat_a", meters: [{ meterRef: "willow_electric", title: "Electricity", utility: "electricity", unit: "kWh" }],
    readings: [
      { readingRef: "willow_oct", meterRef: "willow_electric", at: "2026-10-18T08:00:00Z", value: 1200 },
      { readingRef: "willow_nov", meterRef: "willow_electric", at: "2026-11-18T08:00:00Z", value: 1246 },
    ], addGoto: "add_reading" },
  { unitRef: "north_cabin", meters: [{ meterRef: "cabin_water", title: "Water", utility: "water", unit: "m3" }],
    readings: [{ readingRef: "cabin_nov", meterRef: "cabin_water", at: "2026-11-17T10:00:00Z", value: 17.5, photo: "local:2" }],
    addGoto: "add_reading", style: "history", density: "compact", surface: "outlined" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Meters");
export const probes = [
  choose(
    "For each of my rental unit's utility meters, save cumulative readings over time and compute usage since the previous reading",
  ),
  choose("Give me one labelled number input for entering a new value, with no readings or history", "Field"),
  write(
    "Willow Flat flat_a has electricity meter willow_electric in kWh. Readings willow_oct 1200 at 2026-10-18T08:00:00Z and willow_nov 1246 at 2026-11-18T08:00:00Z. Add at add_reading.",
  ),
  read("Open the form to add a new utility reading", { address: "m1/add", action: "press" }),
] satisfies c.Probe[];

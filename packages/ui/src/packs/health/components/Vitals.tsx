import { z } from "zod";
import {
  placeholderDetail,
  placeholderValue,
  probesFor,
  screenId,
  text,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import {
  KitCard,
  KitContent,
  KitEmpty,
  KitGrid,
  KitRangeBand,
  KitRow,
  KitText,
  useComponentState,
  KitAction,
} from "../../../kit";
import { vitalBand, vitalLabels, vitalLine, vitalRangeLine, vitalStatusLine, vitalUnitLine } from "../copy";
import { seedTitles } from "..";

// Core first: Stats/tiles (the default) cannot place readings on a low/normal/high reference band.
export const meta = {
  id: "Vitals",
  status: "draft",
  group: "data",
  purpose: "Log vital readings alongside their reference ranges without diagnosing.",
  pick: "Body readings with a supplied low/normal/high band, unit and time: pressure, pulse, glucose or temperature. Not numbers without reference ranges (Stats), or progress toward a goal (Progress).",
  writeHints: [
    "low must not exceed high. Ranges are references, not diagnoses; never write a computed status or tone.",
    "low and high describe value only. value2 is an optional paired reading, not checked against the primary range.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Readings typed on the device; health-store device imports need read permission, and ranges are not medical advice.",
  items: { key: "readings", parts: ["root", "label", "value", "value2", "unit", "band", "at"] },
  parts: ["root", "add"],
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] }, parts: { add: ["press"] } },
  read: (input, state) =>
    state !== "filled" ? [] : [...(input as z.output<typeof props>).readings.map(vitalLine), vitalLabels.add],
} as const satisfies Meta;
const readingNumber = z.number().min(-1000000).max(1000000);
export const props = z.strictObject({
  readings: z
    .array(
      z
        .strictObject({
          label: text(20),
          value: readingNumber,
          value2: readingNumber.optional(),
          unit: text(8),
          low: readingNumber,
          high: readingNumber,
          at: text(12),
        })
        .refine(({ low, high }) => low <= high, { path: ["high"] }),
    )
    .min(1)
    .max(4),
  goto: screenId,
});
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  return {
    readings: seedTitles(cast, 2, 20).map((label) => ({
      label,
      value: 0,
      unit: placeholderValue,
      low: 0,
      high: 1,
      at: placeholderDetail,
    })),
    goto: "details",
  };
}
export const examples = [
  {
    readings: [{ label: "Greenhouse temp", value: 22, unit: "°C", low: 18, high: 26, at: "08:10" }],
    goto: "add_reading",
  },
  {
    readings: [{ label: "Post-walk pulse", value: 104, unit: "bpm", low: 60, high: 100, at: "09:15" }],
    goto: "add_reading",
  },
  {
    readings: [
      { label: "Blood pressure", value: 118, value2: 76, unit: "mmHg", low: 90, high: 120, at: "08:10" },
      { label: "Resting pulse", value: 68, unit: "bpm", low: 60, high: 100, at: "08:12" },
    ],
    goto: "add_reading",
  },
  {
    readings: [{ label: "Temperature", value: 37.8, unit: "°C", low: 36.1, high: 37.2, at: "19:30" }],
    goto: "add_reading",
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Vitals");
export const probes = [
  choose(
    "Show my blood pressure and pulse with their low and high reference ranges, markers on bands and reading times",
  ),
  choose(
    "Show three plain numbers, steps, minutes and walks, without any reference ranges or target bands",
    "Stats",
  ),
  write("Resting pulse 68 bpm, low 60 high 100 at 08:12, add opens add_reading"),
  read("Add a new vital reading", { address: "v1/add", action: "press" }),
  read("Open the blood pressure reading", { address: "v1/r1", action: "press" }, 2),
] satisfies Probe[];

type Reading = Props<typeof props, typeof meta>["readings"][number];

function VitalValue({ reading }: { reading: Reading }) {
  const band = (
    <KitRangeBand
      part="band"
      label={vitalUnitLine(reading)}
      value={reading.value}
      low={reading.low}
      high={reading.high}
      {...vitalBand(reading)}
    />
  );
  return (
    <KitRow part="value" label={String(reading.value)} inline>
      <KitRow part="unit" label={reading.unit} inline>
        {reading.value2 === undefined ? (
          band
        ) : (
          <KitRow part="value2" label={String(reading.value2)} inline>
            {band}
          </KitRow>
        )}
      </KitRow>
    </KitRow>
  );
}

export function Vitals({ readings, goto }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  return (
    <KitCard style="inset" part="root" padded>
      {state === "empty" ? (
        <KitEmpty part="label" />
      ) : (
        readings.map((reading) => (
          <KitRow
            key={reading.id}
            item={reading.id}
            label={vitalLine(reading)}
            role="button"
            inset="none"
            lineRole="caption"
          >
            <KitGrid fitLast>
              <KitText role="caption" tone="muted" part="label">
                {reading.label}
              </KitText>
              <KitText role="caption" tone="muted" tabular part="at">
                {reading.at}
              </KitText>
            </KitGrid>
            <VitalValue reading={reading} />
            <KitText role="caption" tone="muted" part={null}>
              {vitalRangeLine(reading)}
            </KitText>
            <KitText role="caption" tone={vitalBand(reading).tone} part={null}>
              {vitalStatusLine(reading)}
            </KitText>
          </KitRow>
        ))
      )}
      <KitContent>
        <KitAction part="add" label={vitalLabels.add} goto={goto} kind="secondary" full />
      </KitContent>
    </KitCard>
  );
}

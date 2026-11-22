import { z } from "zod";
import {
  wordsFor,
  numberLine,
  probesFor,
  screenId,
  text,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
  variantProps,
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
  useWords,
  useVariant,
  KitAction,
} from "../../../kit";
import { vitalBand, vitalLine, vitalPairLine, vitalRangeLine, vitalStatusLine } from "../copy";
import { seedTitles } from "..";
import { healthWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Vitals.generated";

export const meta = {
  id: "Vitals",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Readings typed on the device; health-store device imports need read permission, and ranges are not medical advice.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["at"] } },
  items: { key: "readings", parts: ["root", "label", "value", "value2", "unit", "band", "at", "context"] },
  parts: ["root", "add"],
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] }, parts: { add: ["press"] } },
  read: (input, state, lang?: string): string[] => {
    const { readings, detail } = input as z.output<typeof props>;
    return state === "filled"
      ? [
          ...readings.map((reading) => vitalLine(reading, lang, detail !== "brief")),
          healthWordsFor(lang).vitalLabels.add,
        ]
      : [];
  },
} as const satisfies Meta;
const readingNumber = z.number().min(-1000000).max(1000000);
export const props = z.strictObject({
  ...variantProps(meta.variants),
  style: z.enum(["band", "history"]).default("band"),
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
          // The localized reader includes the timestamp only when the row displays it.
          at: z.string().trim().min(1).max(12),
          context: z.enum(["resting", "fasting", "post_meal", "active"]).optional(),
        })
        .refine(({ low, high }) => low <= high, { path: ["high"] }),
    )
    .min(1)
    .max(4),
  goto: screenId,
});
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail, placeholderValue } = wordsFor(lang);
  return {
    readings: seedTitles(cast, 2, 20, lang).map((label) => ({
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
    readings: [{ label: "Resting pulse", value: 68, unit: "bpm", low: 60, high: 100, at: "08:10" }],
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
  {
    style: "history",
    readings: [
      {
        label: "Blood glucose",
        value: 92,
        unit: "mg/dL",
        low: 70,
        high: 99,
        at: "07:15",
        context: "fasting",
      },
      {
        label: "Blood glucose",
        value: 126,
        unit: "mg/dL",
        low: 70,
        high: 140,
        at: "13:25",
        context: "post_meal",
      },
    ],
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
  {
    ...write(
      "Show resting pulse 68 bpm with reference 60 to 100 and time 08:12. Adding a reading opens add_reading. Keep the recorded time in the data but omit it from the display.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Add a new vital reading", { address: "v1/add", action: "press" }),
  read("Open the blood pressure reading", { address: "v1/r1", action: "press" }, 2),
  {
    ...write(
      "Log blood glucose of 92 mg/dL at 07:15, with reference 70 to 99. I was fasting, so record fasting as the reading context, not just part of the label. Adding a reading opens add_reading.",
    ),
    fields: { "readings.0.context": "fasting" },
  },
  {
    ...write(
      "Show a compact history without bands: resting pulse 68 bpm at 08:10 and resting pulse 71 bpm at 09:15, each with reference 60 to 100. Adding a reading opens add_reading.",
    ),
    fields: { style: "history" },
  },
] satisfies Probe[];
type Reading = Props<typeof props, typeof meta>["readings"][number];
function VitalValue({ reading, lang, history }: { reading: Reading; lang: string; history: boolean }) {
  const value = numberLine(reading.value, lang);
  const pair = reading.value2 === undefined ? "" : vitalPairLine(reading.value2, lang);
  const numberScale = `${value}${pair}`.length > 12 ? "compact" : "display";
  const tone = vitalBand(reading).tone;
  const context = reading.context && healthWordsFor(lang).vitalLabels.context[reading.context];
  const display = (
    <KitContent group={history ? "content" : "response"}>
      <KitRow
        inline
        label={reading.unit}
        lineRole={numberScale === "compact" ? "body" : "number"}
        leading={
          <KitText role="number" numberScale={numberScale} tone={tone} tabular part="value">
            {value}
            {reading.value2 !== undefined && (
              <KitText role="number" numberScale={numberScale} tone={tone} tabular part="value2">
                {pair}
              </KitText>
            )}
          </KitText>
        }
      >
        <KitText role="number" numberScale={numberScale} part="unit">
          <KitText role="caption" tone="muted" part={null}>
            {reading.unit}
          </KitText>
        </KitText>
      </KitRow>
      {!history && context && (
        <KitText role="caption" tone="muted" part="context">
          {context}
        </KitText>
      )}
    </KitContent>
  );
  return history ? (
    display
  ) : (
    <KitRangeBand
      part="band"
      label={reading.unit}
      value={reading.value}
      low={reading.low}
      high={reading.high}
      {...vitalBand(reading)}
      reading={display}
    />
  );
}

export function Vitals({ readings, goto, detail, style }: Props<typeof props, typeof meta>) {
  const surface = "card";
  const full = useVariant("detail", meta.variants.detail, detail) === "full";
  const state = useComponentState();
  const { lang, words } = useWords(healthWordsFor);
  return (
    <KitCard style="inset" part="root" padded surface={surface}>
      {state === "empty" ? (
        <KitEmpty part="label" />
      ) : (
        readings.map((reading) => (
          <KitRow
            key={reading.id}
            item={reading.id}
            label={vitalLine(reading, lang, full)}
            role="button"
            inset="none"
            lineRole="caption"
          >
            <KitGrid fitLast>
              {style === "history" && reading.context ? (
                <KitContent>
                  <KitText role="caption" tone="muted" part="label">
                    {reading.label}
                  </KitText>
                  <KitText role="caption" tone="muted" part="context">
                    {words.vitalLabels.context[reading.context]}
                  </KitText>
                </KitContent>
              ) : (
                <KitText role="caption" tone="muted" part="label">
                  {reading.label}
                </KitText>
              )}
              {full && (
                <KitText role="caption" tone="muted" tabular part="at">
                  {reading.at}
                </KitText>
              )}
            </KitGrid>
            <VitalValue reading={reading} lang={lang} history={style === "history"} />
            <KitText role="caption" tone="muted" part={null}>
              {vitalRangeLine(reading, lang)}
            </KitText>
            <KitText role="caption" tone={vitalBand(reading).tone} part={null}>
              {vitalStatusLine(reading, lang)}
            </KitText>
          </KitRow>
        ))
      )}
      <KitContent>
        <KitAction part="add" label={words.vitalLabels.add} goto={goto} kind="secondary" full />
      </KitContent>
    </KitCard>
  );
}

import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { historyRows, meterEntries, meterSeries, meterSummary, readMeters, validMeterSeries } from "../copy";
import { propertyWordsFor } from "../lang";
import { dateTime, distinct, ref, seedLabels } from "../seeds";
import { prompt } from "../../../entry/prompt-Meters.generated";

// Core first: Field/number cannot validate cumulative readings or derive consumption over each meter's history.
// prettier-ignore
export const meta = {
  id: "Meters",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Manual meter series live on the device, without a smart-meter service or bill calculation.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["previous"] } },
  parts: ["root", "title", "selector", "empty", "status", "sub", "add", "add_label"],
  items: { key: "entries", parts: ["root", "title", "latest", "previous", "at", "value", "usage", "photo", "evidence"], visibleWhen: { visible: true } },
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
  read: readMeters,
  live: { derive: (input): c.Values => meterDisplay(input as MetersProps, input.meterRef) },
} as const satisfies c.Meta;

// prettier-ignore
const meter = z.strictObject({
  meterRef: ref, title: c.text(32),
  utility: z.enum(["electricity", "gas", "water"]), unit: z.enum(["kWh", "m3", "litre"]),
});
// prettier-ignore
const reading = z.strictObject({
  readingRef: ref, meterRef: ref, at: dateTime, value: z.number().nonnegative(), photo: c.photo.optional(),
});
// prettier-ignore
const schema = z
  .strictObject({
    ...c.variantProps(meta.variants), unitRef: ref.meta({ kind: "ref" }),
    meters: z.array(meter).min(1).max(6), readings: z.array(reading).min(0).max(24),
    addGoto: c.screenId, style: z.enum(["register", "history"]).default("register"),
  })
  .refine(({ meters }) => distinct(meters, ({ meterRef }) => meterRef), { path: ["meters"] })
  .refine(
    ({ meters, readings }) =>
      distinct(readings, ({ readingRef }) => readingRef) &&
      readings.every((reading) => meters.some((meter) => meter.meterRef === reading.meterRef)) &&
      meters.every(({ meterRef }) => validMeterSeries(meterSeries(readings, meterRef), Date.now())),
    { path: ["readings"], message: "Use known meters, distinct past instants and nondecreasing readings" },
  );
// prettier-ignore
const withEntries = (value: z.output<typeof schema>) => ({ ...value, add: { goto: value.addGoto }, entries: meterEntries(value, value.style) });
export const props = schema.overwrite(withEntries) as typeof schema &
  z.ZodType<ReturnType<typeof withEntries>, z.input<typeof schema>>;

// prettier-ignore
export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const { ref, title } = seedLabels(input)[0]!;
  return { unitRef: ref, meters: [{ meterRef: `${ref}_meter`, title, utility: "electricity", unit: "kWh" }], readings: [], addGoto: "details" };
}
// prettier-ignore
const historyExample = { unitRef: "north_cabin", meters: [
      { meterRef: "cabin_water", title: "Water", utility: "water", unit: "m3" },
      { meterRef: "cabin_gas", title: "Gas", utility: "gas", unit: "m3" },
    ],
    readings: [
      { readingRef: "cabin_oct", meterRef: "cabin_water", at: "2026-10-17T10:00:00Z", value: 14 },
      { readingRef: "cabin_nov", meterRef: "cabin_water", at: "2026-11-17T10:00:00Z", value: 17.5, photo: "local:2" },
    ],
    addGoto: "add_reading", style: "history" } satisfies z.input<typeof props>;
// prettier-ignore
export const examples = [
  { unitRef: "flat_a", meters: [
      { meterRef: "willow_electric", title: "Electricity", utility: "electricity", unit: "kWh" },
      { meterRef: "willow_water", title: "Water", utility: "water", unit: "m3" },
    ],
    readings: [
      { readingRef: "willow_oct", meterRef: "willow_electric", at: "2026-10-18T08:00:00Z", value: 1200 },
      { readingRef: "willow_nov", meterRef: "willow_electric", at: "2026-11-18T08:00:00Z", value: 1246 },
      { readingRef: "willow_water_nov", meterRef: "willow_water", at: "2026-11-18T08:00:00Z", value: 17.5 },
    ], addGoto: "add_reading" },
  historyExample, { ...historyExample, density: "compact" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Meters");
// prettier-ignore
export const probes = [
  choose("For each of my rental unit's utility meters, save cumulative readings over time and compute usage since the previous reading"),
  choose("Give me one labelled number input for entering a new value, with no readings or history", "Field"),
  write("Willow Flat flat_a has electricity meter willow_electric in kWh. Readings willow_oct 1200 at 2026-10-18T08:00:00Z and willow_nov 1246 at 2026-11-18T08:00:00Z. Add at add_reading."),
  {
    ...write("Show the utility meter register for Flat A (flat_a). Electricity meter willow_electric in kWh: willow_oct was 1200 on 18 October 2026 at 08:00 UTC; willow_nov was 1246 on 18 November 2026 at 08:00 UTC. Add opens add_reading. Keep both readings in the data, but show only the latest value and usage, not the previous cumulative value."),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the form to add a new utility reading", { address: "m1/add", action: "press" }),
] satisfies c.Probe[];

type MetersProps = c.Props<typeof props, typeof meta>;
type Density = c.AxisValue<"density">;
// prettier-ignore
function meterDisplay(input: MetersProps, selection: unknown): Pick<MetersProps, "style" | "entries"> {
  const selected = input.meters.find((meter) => meter.meterRef === selection)?.meterRef;
  if (!selected) return { style: input.style, entries: input.entries };
  // Reuse the wire order so switching meters never renumbers an evidence address.
  return c.stampItemIds(meta, { style: "history", entries: meterEntries(input, "history", selected) }) as Pick<MetersProps, "style" | "entries">;
}

// prettier-ignore
function MeterRegister({ input, density, detail, lang }: { input: MetersProps; density: Density; detail: string; lang: string }) {
  const loading = kit.useComponentState() === "loading";
  const { words: { meters: words } } = kit.useWords(propertyWordsFor);
  return input.entries.map((row) => {
    if (row.entryKind !== "meter") return null;
    const { latest, previous, usage } = meterSummary(meterSeries(input.readings, row.meterRef), row.unit, lang);
    if (loading) return <kit.KitRow key={row.id} label={row.title} inline density={density}>
      <kit.KitSkeleton shape="figure" density={density} inset="none" content={[
        ["body", row.title], ["label", latest ? words.latestLabel : undefined],
        [latest ? "number" : "label", latest ?? words.noReadings, "start", "compact"],
        ["label", detail === "full" ? previous : undefined], ["label", usage],
      ]} />
    </kit.KitRow>;
    return <kit.KitRow key={row.id} item={row.id} role="button" label={row.title} density={density} inline
      trailing={<kit.KitIcon name="chevron_right" decorative tone="muted" />}>
      <kit.KitContent density={density}>
        <kit.KitText part="title" role="body" density={density}>{row.title}</kit.KitText>
        {latest ? <kit.KitContent rhythm="flush" {...{ density }}>
          <kit.KitText part={null} role="label" tone="muted" {...{ density }}>{words.latestLabel}</kit.KitText>
          <kit.KitText part="latest" role="number" numberScale="compact" tabular {...{ density }}>{latest}</kit.KitText>
        </kit.KitContent> : <kit.KitText part="latest" role="label" tone="muted" {...{ density }}>{words.noReadings}</kit.KitText>}
        {detail === "full" && previous && <kit.KitText part="previous" role="label" density={density} tone="muted">{previous}</kit.KitText>}
        {usage && <kit.KitText part="usage" role="label" density={density} tone="muted">{usage}</kit.KitText>}
      </kit.KitContent>
    </kit.KitRow>;
  });
}

// prettier-ignore
function MeterHistory({ input, selection, density, lang, words }: { input: MetersProps; selection: unknown; density: Density; lang: string; words: ReturnType<typeof propertyWordsFor>["meters"] }) {
  const rows = historyRows(input, lang);
  return <>
    <kit.KitTrack part="selector" role="radiogroup" label={words.register}>
      {input.entries.map((row) => row.entryKind === "meter" &&
        <kit.KitChip key={row.id} item={row.id} role="radio" look="segment" labelPart="title" label={row.title} on={row.meterRef === (selection ?? input.meters[0]!.meterRef)} />)}
    </kit.KitTrack>
    {!rows.length && <kit.KitText part="empty" tone="muted" role="body">{words.noReadings}</kit.KitText>}
    {rows.map((row) => <kit.KitRow key={row.id} item={row.id} label={row.date} density={density} inset="none">
      <kit.KitContent density={density}>
        <kit.KitGrid fitLast {...{ density }}>
          <kit.KitText part="at" role="label" tone="muted" {...{ density }}>{row.date}</kit.KitText>
          <kit.KitText part="value" role="number" numberScale="compact" align="end" tabular {...{ density }}>{row.amount}</kit.KitText>
        </kit.KitGrid>
        {row.usage && <kit.KitText part="usage" role="label" tone="muted" density={density}>{row.usage}</kit.KitText>}
        {row.photo && <kit.KitRow part="photo" role="button" inline label={words.photo} {...{ density }}>
          <kit.KitContent lead={<kit.KitPhoto part="evidence" photo={row.photo} label={words.photo} />} leadingAlign="row" {...{ density }}>
            <kit.KitRow part={null} inline label={words.photo}><kit.KitText part={null} role="label" tone="accent" {...{ density }}>{words.photo}</kit.KitText></kit.KitRow>
          </kit.KitContent>
        </kit.KitRow>}
      </kit.KitContent>
    </kit.KitRow>)}
  </>;
}

// prettier-ignore
export function Meters(input: MetersProps) {
  const { lang, words: { meters: words } } = kit.useWords(propertyWordsFor);
  const { screen, component, thing } = kit.usePartContext();
  const state = kit.useComponentState();
  const selection = kit.useControlValue<unknown>(`${screen}/${component}/$meterRef`, undefined);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const display = { ...input, ...meterDisplay(input, selection) };
  return <kit.KitCard part="root" padded surface={input.surface} density={density}>
    {state === "loading" ? <>
      <kit.KitSkeleton shape="figure" inset="none" content={[["heading", words[display.style]]]} />
      <MeterRegister input={display} {...{ detail, density, lang }} />
      <kit.KitSkeleton shape="control" label={words.add} kind="secondary" full />
    </> : state === "empty" ? <kit.KitEmpty part="empty" {...(!thing ? { title: words.noReadings } : {})} decorativeIcon /> :
      state === "success" ? <kit.KitEmpty part="status" title={words.saved} icon="check" tone="good" decorativeIcon /> :
      state === "error" ? <kit.KitContent>
        <kit.KitText part="status" role="heading" tone="bad">{words.error}</kit.KitText>
        <kit.KitText part="sub" role="body" tone="muted">{words.errorDetail}</kit.KitText>
      </kit.KitContent> : <>
        <kit.KitText part="title" role="heading">{words[display.style]}</kit.KitText>
        {display.style === "history" ? <MeterHistory input={display} {...{ selection, density, lang, words }} /> :
          <MeterRegister input={display} {...{ detail, density, lang }} />}
      </>}
    {(state === "filled" || state === "empty") && <kit.KitAction part="add" goto={input.addGoto} label={words.add} kind="secondary" full />}
  </kit.KitCard>;
}

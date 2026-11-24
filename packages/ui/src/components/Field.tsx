import {
  useLiveControls,
  useKit,
  useWords,
  KitCard,
  KitFieldControl,
  KitMicCapture,
  KitSlider,
  KitText,
} from "../kit";
import {
  wordsFor,
  probesFor,
  clip,
  clock,
  defineLocalState,
  isoDate,
  numberLine,
  photo,
  repeatOptions,
  text,
  thingOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { z } from "zod";
import { prompt } from "../entry/prompt-Field.generated";

const endpoint = z.int().min(-1000000).max(1000000);
// Use a local event instead of Field's legacy single-value set handler.
// prettier-ignore
const rangeState = defineLocalState({
  schema: z.strictObject({ min: endpoint, max: endpoint, lower: endpoint, upper: endpoint }).refine(fitsRange),
  events: ["lower.set", "upper.set"],
  initial: ({ min, max, lower, upper }) => ({ min, max, lower, upper }) as Record<keyof Endpoints, number>,
  reduce: (state, { part, value }) => ({ state: { ...state, [part]: value } }),
  project: ({ lower, upper }) => ({ lower, upper }),
});
export const meta = {
  id: "Field",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "A field value stored on one record in the on-device database.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["hint"] } },
  parts: ["root", "label", "field", "hint", "photo", "lower", "upper", "voice", "range_reading", "reveal"],
  partTiers: { voice: "ok", reveal: "service" },
  partTiersBy: { field: { prop: "kind", tiers: { photo: "ok", password: "service", code: "service" } } },
  localState: rangeState,
  states: ["filled"],
  // prettier-ignore
  actions: {
    parts: {
      field: ["type", "select", "toggle", "set", "press"],
      lower: ["set"], upper: ["set"], voice: ["start", "stop"],
    },
    when: {
      "field.type": { mode: "input" }, "field.select": { mode: "choice" },
      "field.toggle": { kind: "toggle" },
      "field.set": { kind: "slider" }, "field.press": { kind: "photo" },
      lower: { kind: "range" }, upper: { kind: "range" },
      voice: { kind: "voice" },
    },
  },
  read: (input, state, lang, _data, _currency, get): string[] => {
    const { repeatLabels, photoLabels, chosen, fieldRange, composer, mediaUnavailable } = wordsFor(lang);
    const { kind, options, lower, upper, repeat } = input as z.output<typeof props>;
    if (state !== "filled") return [];
    if (kind === "voice") return get?.("$runtime") ? [composer.voice] : [composer.voice, mediaUnavailable];
    if (kind === "range") return [fieldRange.reading(numberLine(lower!, lang), numberLine(upper!, lang))];
    if (kind === "repeat") {
      const choices = repeatOptions.map((option) => repeatLabels[option]);
      return repeat ? [...choices, chosen(repeatLabels[repeat])] : choices;
    }
    return kind === "choice" ? (options ?? []) : kind === "photo" ? [photoLabels.add] : [kind];
  },
} as const satisfies Meta;

const fits = (kind: string, value: string) =>
  kind === "toggle"
    ? ["on", "off"].includes(value)
    : kind === "date"
      ? isoDate.safeParse(value).success
      : kind === "time"
        ? clock.safeParse(value).success
        : kind === "photo"
          ? photo.safeParse(value).success
          : !["number", "slider"].includes(kind) || Number.isFinite(Number(value));

type Endpoints = {
  min?: number | undefined;
  max?: number | undefined;
  lower?: number | undefined;
  upper?: number | undefined;
};
// prettier-ignore
function fitsRange({ min, max, lower, upper }: Endpoints) {
  return (min !== undefined && max !== undefined && lower !== undefined && upper !== undefined &&
    min < max && min <= lower && lower <= upper && upper <= max);
}

// prettier-ignore
export const props = z.strictObject({
  ...variantProps(meta.variants),
  kind: z.enum(["text", "number", "date", "time", "choice", "repeat", "toggle", "slider", "photo", "range", "voice", "email", "password", "code", "phone"]).default("text"),
  label: text(24),
  value: text(40).refine((value) => !/[\r\n]/.test(value), "A field is one line").optional(),
  length: z.int().min(4).max(8).optional(),
  repeat: z.enum(repeatOptions).optional(), hint: text(60).optional(),
  options: z.array(text(16)).min(2).max(4).optional(),
  min: endpoint.optional(), max: endpoint.optional(), lower: endpoint.optional(), upper: endpoint.optional(),
})
  .refine(({ kind, min, max, lower, upper, value }) => kind === "range"
    ? value === undefined && fitsRange({ min, max, lower, upper })
    : [min, max, lower, upper].every((point) => point === undefined) && (kind !== "voice" || value === undefined),
    { message: "Use ordered numeric endpoints only for range and no text value for range or voice" })
  .refine(({ kind, options }) => (kind === "choice") === (options !== undefined),
    { path: ["options"], message: "Options are required only for choice" })
  .refine(({ options, value }) => !options || (new Set(options).size === options.length && (value === undefined || options.includes(value))),
    { path: ["value"], message: "Choice needs distinct options and an available value" })
  .refine(({ kind, value }) => value === undefined || fits(kind, value),
    { path: ["value"], message: "Value must fit the kind: on or off, or a finite number" })
  .refine(({ kind, value }) => kind !== "repeat" || value === undefined,
    { path: ["value"], message: "A repeat uses repeat, not value" })
  .refine(({ kind, repeat }) => repeat === undefined || kind === "repeat",
    { path: ["repeat"], message: "Repeat is only for the repeat kind" })
  .refine(({ kind, length }) => length === undefined || kind === "code",
    { path: ["length"], message: "Length is only for the code kind" })
  .refine(({ kind, value }) => value === undefined || (kind !== "password" && kind !== "code"),
    { path: ["value"], message: "Passwords and codes must start blank" })
  .overwrite((value) => ({
    ...value,
    ...(value.detail === "brief" ? { hint: undefined } : {}),
    mode: ["text", "number", "date", "time", "email", "phone"].includes(value.kind) ? "input" :
      value.kind === "choice" || value.kind === "repeat" ? "choice" : "other",
  }));
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  return { kind: "text", label: clip(thingOf(cast)?.fields[0]?.trim() || placeholderDetail, 24) };
}
const interval = {
  kind: "number",
  label: "Water interval (days)",
  value: "7",
  hint: "Use whole days.",
} as const;
const walkRange = {
  kind: "range",
  label: "Walk duration (min)",
  min: 0,
  max: 90,
  lower: 20,
  upper: 60,
  hint: "Set the shortest and longest walk.",
} as const;
export const examples = [
  { kind: "text", label: "Plant name", value: "Fern" },
  { kind: "date", label: "Walk date", value: "2026-11-19" },
  interval,
  { kind: "time", label: "Walk time", value: "09:00" },
  { kind: "choice", label: "Walk length", options: ["30 min", "45 min", "60 min"], value: "30 min" },
  { kind: "toggle", label: "Remind me", value: "on" },
  { kind: "slider", label: "Walk intensity", value: "5" },
  { kind: "photo", label: "Dog photo" },
  { kind: "repeat", label: "Water it", repeat: "weekly" },
  { ...interval, detail: "brief" },
  walkRange,
  { ...walkRange },
  { kind: "voice", label: "Voice note" },
  {
    kind: "choice",
    label: "Class type",
    options: ["Strength circuit", "Spin express", "Mobility flow"],
    value: "Strength circuit",
  },
  { kind: "email", label: "Email address", value: "gardener@example.test" },
  { kind: "password", label: "Password" },
  { kind: "code", label: "Email code", length: 4 },
  { kind: "code", label: "Verification code" },
  { kind: "code", label: "Text message code", length: 8 },
  { kind: "phone", label: "Phone number", value: "+1 202-555-0142" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Field");
export const probes = [
  choose("Let me enter the name of a new plant on its form"),
  choose("Find a plant in my collection by typing part of its name", "Search"),
  write("A form input labelled Plant name, with Fern already entered"),
  write("A form input labelled Water it, set to repeat every week"),
  {
    ...write(
      'A usual-size input called Plant name. Save the hint "Use a short name", but hide it on screen.',
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Name the plant Basil", { address: "f1/field", action: "type" }),
  {
    ...write(
      "On the form, let me choose both ends of a Walk duration range. The scale goes from 0 to 90; start the two handles at 20 and 60.",
    ),
    expectProps: { kind: "range", min: 0, max: 90, lower: 20, upper: 60 },
  },
  {
    ...write("Add one form input called Voice note that records from my microphone instead of typing."),
    expectProps: { kind: "voice" },
  },
  {
    ...write("Let me enter my email address to log in. Label the blank input Email address."),
    expectProps: { kind: "email" },
  },
  {
    ...write("Add a blank Password input that masks what I type."),
    expectProps: { kind: "password" },
  },
  {
    ...write("Let me type the eight-digit one-time code from my text message. Leave the boxes empty."),
    expectProps: { kind: "code", length: 8 },
  },
  {
    ...write("Add a blank Phone number input that opens the phone keypad."),
    expectProps: { kind: "phone" },
  },
] satisfies Probe[];

function RangeField(input: Props<typeof props, typeof meta>) {
  const { lang, words } = useWords();
  const { min, max, lower, upper } = useLiveControls(meta, input) as z.output<typeof props>;
  const { fieldRange } = words;
  return (
    <>
      <KitText part="range_reading" role="number" numberScale="compact" tabular>
        {fieldRange.reading(numberLine(lower!, lang), numberLine(upper!, lang))}
      </KitText>
      <KitSlider
        min={min!}
        max={max!}
        range={[
          { part: "lower", value: lower!, label: fieldRange.lower(input.label) },
          { part: "upper", value: upper!, label: fieldRange.upper(input.label) },
        ]}
      />
    </>
  );
}

export function Field(input: Props<typeof props, typeof meta>) {
  const { repeatLabels, composer } = useWords().words;
  const density = useKit().density;
  return (
    <KitCard style="plain" part="root" padded inset="none" density={density}>
      <KitText role="label" part="label" density={density}>
        {input.label}
      </KitText>
      {input.kind === "range" ? (
        <RangeField {...input} />
      ) : input.kind === "voice" ? (
        <KitMicCapture
          part="voice"
          target={{ part: "voice" }}
          label={composer.voice}
          level={0}
          recording={false}
        />
      ) : (
        <KitFieldControl
          kind={input.kind}
          label={input.label}
          value={input.value}
          length={input.length}
          choices={
            input.kind === "repeat" ? repeatOptions.map((option) => repeatLabels[option]) : input.options
          }
          chosen={input.kind === "repeat" && input.repeat ? repeatLabels[input.repeat] : input.value}
        />
      )}
      {input.detail === "full" && input.hint && (
        <KitText role="caption" tone="muted" part="hint" density={density}>
          {input.hint}
        </KitText>
      )}
    </KitCard>
  );
}

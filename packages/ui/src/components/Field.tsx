import { useWords, KitCard, KitFieldControl, KitText } from "../kit";
import {
  wordsFor,
  probesFor,
  clip,
  clock,
  isoDate,
  photo,
  repeatOptions,
  text,
  thingOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { z } from "zod";

export const meta = {
  id: "Field",
  group: "input",
  purpose: "Enter or change one labelled piece of information on a form.",
  pick: "Enter one named value, such as a name, date, amount or form choice. Not finding things by typing a query (Search), standalone collection filters and quick choices (Chips), several lines of writing (Composer) or options that each need a sentence (Choice).",
  writeHints: [
    'For a recurring schedule use kind: "repeat" and repeat: "weekly" (or another repeat enum). Omit value; never use kind: "text" with repeat.',
    "Date values use YYYY-MM-DD, time values HH:MM and photo values lib:<tag> or local:<n>. Fields are one line.",
    'Example recurring input: {"kind":"repeat","label":"Water it","repeat":"weekly"}.',
  ],
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "A field value stored on one record in the on-device database.",
  parts: ["root", "label", "field", "hint", "photo"],
  states: ["filled"],
  actions: {
    parts: { field: ["type", "select", "toggle", "set", "press"] },
    when: {
      "field.type": { mode: "input" },
      "field.select": { mode: "choice" },
      "field.toggle": { kind: "toggle" },
      "field.set": { kind: "slider" },
      "field.press": { kind: "photo" },
    },
  },
  read: (input, state, lang?: string) => {
    const { repeatLabels, photoLabels } = wordsFor(lang);

    const { kind, options } = input as z.output<typeof props>;
    if (state !== "filled") return [];
    if (kind === "repeat") {
      const { repeat } = input as z.output<typeof props>;
      return [
        ...repeatOptions.map((option) => repeatLabels[option]),
        ...(repeat ? [`${repeatLabels[repeat]} chosen`] : []),
      ];
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

export const props = z
  .strictObject({
    kind: z
      .enum(["text", "number", "date", "time", "choice", "repeat", "toggle", "slider", "photo"])
      .default("text"),
    label: text(24),
    value: text(40)
      .refine((value) => !/[\r\n]/.test(value), "A field is one line")
      .optional(),
    repeat: z.enum(repeatOptions).optional(),
    hint: text(60).optional(),
    options: z.array(text(16)).min(2).max(4).optional(),
  })
  .refine(({ kind, options }) => (kind === "choice" ? options !== undefined : options === undefined), {
    path: ["options"],
    message: "Options are required only for choice",
  })
  .refine(
    ({ options, value }) =>
      !options ||
      (new Set(options).size === options.length && (value === undefined || options.includes(value))),
    {
      path: ["value"],
      message: "Choice needs distinct options and an available value",
    },
  )
  .refine(({ kind, value }) => value === undefined || fits(kind, value), {
    path: ["value"],
    message: "Value must fit the kind: on or off, or a finite number",
  })
  .refine(({ kind, value }) => kind !== "repeat" || value === undefined, {
    path: ["value"],
    message: "A repeat uses repeat, not value",
  })
  .refine(({ kind, repeat }) => repeat === undefined || kind === "repeat", {
    path: ["repeat"],
    message: "Repeat is only for the repeat kind",
  })
  .overwrite((value) => ({
    ...value,
    mode: ["text", "number", "date", "time"].includes(value.kind)
      ? "input"
      : value.kind === "choice" || value.kind === "repeat"
        ? "choice"
        : "other",
  }));
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  return { kind: "text", label: clip(thingOf(cast)?.fields[0]?.trim() || placeholderDetail, 24) };
}
export const examples = [
  { kind: "text", label: "Plant name", value: "Fern" },
  { kind: "date", label: "Walk date", value: "2026-11-19" },
  { kind: "number", label: "Water every", value: "7", hint: "days" },
  { kind: "time", label: "Walk time", value: "09:00" },
  { kind: "choice", label: "Walk length", options: ["30 min", "45 min", "60 min"], value: "30 min" },
  { kind: "toggle", label: "Remind me", value: "on" },
  { kind: "slider", label: "Walk intensity", value: "5" },
  { kind: "photo", label: "Dog photo" },
  { kind: "repeat", label: "Water it", repeat: "weekly" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Field");
export const probes = [
  choose("Let me enter the name of a new plant on its form"),
  choose("Find a plant in my collection by typing part of its name", "Search"),
  write("A form input labelled Plant name, with Fern already entered"),
  write("A form input labelled Water it, set to repeat every week"),
  read("Name the plant Basil", { address: "f1/field", action: "type" }),
] satisfies Probe[];

export function Field(input: Props<typeof props, typeof meta>) {
  const { repeatLabels } = useWords().words;
  return (
    <KitCard style="plain" part="root" padded inset="none">
      <KitText role="label" part="label">
        {input.label}
      </KitText>
      <KitFieldControl
        kind={input.kind}
        label={input.label}
        value={input.value}
        choices={
          input.kind === "repeat" ? repeatOptions.map((option) => repeatLabels[option]) : input.options
        }
        chosen={input.kind === "repeat" && input.repeat ? repeatLabels[input.repeat] : input.value}
      />
      {input.hint && (
        <KitText role="caption" tone="muted" part="hint">
          {input.hint}
        </KitText>
      )}
    </KitCard>
  );
}

import { z } from "zod";
import {
  clip,
  photoLabels,
  placeholderDetail,
  placeholderTitle,
  placeholderValue,
  text,
  thingOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import {
  KitAction,
  KitCard,
  KitChip,
  KitContent,
  KitInput,
  KitPhoto,
  KitSlider,
  KitText,
  KitTrack,
  KitTrail,
} from "../kit";

export const meta = {
  id: "Field",
  group: "input",
  purpose: "Enter or change one labelled piece of information on a form.",
  pick: "Enter one named value, such as a name, date, amount or form choice. Not finding things by typing a query (Search), or standalone collection filters and quick choices (Chips).",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "A field value stored on one record in the on-device database.",
  parts: ["root", "label", "field", "hint", "photo"],
  states: ["filled"],
  actions: {
    parts: { field: ["type", "select", "toggle", "set", "press"] },
    when: {
      "field.type": { typed: "input" },
      "field.select": { kind: "choice" },
      "field.toggle": { kind: "toggle" },
      "field.set": { kind: "slider" },
      "field.press": { kind: "photo" },
    },
  },
  aliases: ["input", "formfield", "entry"],
  read: (input, state) => {
    const { kind, options } = input as z.output<typeof props>;
    if (state !== "filled") return [];
    return kind === "choice" ? (options ?? []) : kind === "photo" ? [photoLabels.add] : [];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    kind: z.enum(["text", "number", "date", "time", "choice", "toggle", "slider", "photo"]).default("text"),
    label: text(24),
    value: text(40).optional(),
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
  .refine(({ kind, value }) => value === undefined || kind !== "toggle" || ["on", "off"].includes(value), {
    path: ["value"],
    message: "Toggle value must be on or off",
  })
  .refine(
    ({ kind, value }) =>
      value === undefined || !["number", "slider"].includes(kind) || Number.isFinite(Number(value)),
    {
      path: ["value"],
      message: "Numeric value must be finite",
    },
  )
  .overwrite((value) => ({
    ...value,
    typed: ["text", "number", "date", "time"].includes(value.kind) ? "input" : "other",
  }));
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  return { kind: "text", label: clip(thingOf(cast)?.fields[0]?.trim() || placeholderDetail, 24) };
}
export const examples = [
  { kind: "text", label: "Plant name", value: "Fern" },
  { kind: "date", label: "Walk date" },
  { kind: "number", label: "Water every", value: "7", hint: "days" },
  { kind: "time", label: "Walk time", value: "09:00" },
  { kind: "choice", label: "Walk length", options: ["30 min", "45 min", "60 min"], value: "30 min" },
  { kind: "toggle", label: "Remind me", value: "on" },
  { kind: "slider", label: "Walk intensity", value: "5" },
  { kind: "photo", label: "Dog photo" },
] satisfies z.input<typeof props>[];
export const probes = [
  { kind: "choose", need: "Let me enter the name of a new plant on its form", expect: "Field" },
  { kind: "choose", need: "Find a plant in my collection by typing part of its name", expect: "Search" },
  { kind: "write", brief: "A form input labelled Plant name, with Fern already entered", expect: "Field" },
  { kind: "read", screen: 0, task: "Name the plant Basil", expect: { address: "f1/field", action: "type" } },
] satisfies Probe[];

function FieldControl({ kind, label, value, options }: Props<typeof props, typeof meta>) {
  if (kind === "choice") {
    return (
      <KitTrack look="segments" part="field" role="radiogroup" label={label}>
        {options?.map((option) => (
          <KitChip
            key={option}
            item={null}
            label={option}
            on={option === value}
            role="radio"
            look="segment"
          />
        ))}
      </KitTrack>
    );
  }
  if (kind === "toggle") {
    return (
      <KitContent lineRole="body" lead={<KitTrail kind="toggle" on={value === "on"} part="field" />}>
        {value && (
          <KitText role="body" part={null}>
            {value}
          </KitText>
        )}
      </KitContent>
    );
  }
  if (kind === "slider") {
    const number = Number(value ?? placeholderValue);
    return (
      <>
        {value && (
          <KitText role="number" tabular part={null}>
            {value}
          </KitText>
        )}
        <KitSlider
          value={number}
          label={label}
          min={Math.min(0, number)}
          max={Math.max(10, number)}
          part="field"
        />
      </>
    );
  }
  if (kind === "photo") {
    const photo = value ?? `lib:${placeholderTitle(0).toLowerCase().replace(/ /g, "_")}`;
    return (
      <>
        <KitPhoto photo={photo} label={value ?? label} shape="wide" part="photo" />
        <KitAction label={photoLabels.add} icon="camera" kind="secondary" part="field" full />
      </>
    );
  }
  return <TypedField kind={kind} label={label} value={value} />;
}

function TypedField({ kind, label, value }: Props<typeof props, typeof meta>) {
  return (
    <KitInput
      label={label}
      hint={label}
      value={value}
      icon={kind === "date" ? "calendar" : kind === "time" ? "clock" : undefined}
      part="field"
    />
  );
}

export function Field(input: Props<typeof props, typeof meta>) {
  return (
    <KitCard style="plain" part="root" padded>
      <KitText role="label" part="label">
        {input.label}
      </KitText>
      <FieldControl {...input} />
      {input.hint && (
        <KitText role="caption" tone="muted" part="hint">
          {input.hint}
        </KitText>
      )}
    </KitCard>
  );
}

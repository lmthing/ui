import { z } from "zod";
import {
  detailOf,
  itemsOf,
  photo,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  variantProps,
  wordsFor,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import * as kit from "../../../kit";
import { activityLabel } from "../copy";
import { dataWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-ActivityLog.generated";

// Core first: Timeline/default lays out events or plans; it does not identify who changed a record with avatars.
export const meta = {
  id: "ActivityLog",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "A change log kept by a shared app.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    lead: ["avatar", "none"],
  },
  variantParts: { "lead.none": { hides: ["photo"] } },
  parts: ["root", "title"],
  items: { key: "entries", parts: ["root", "who", "photo", "text", "time"] },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
  live: {
    derive: (input): Record<string, unknown> =>
      input.lead === "none"
        ? { entries: (input.entries as Entry[]).map(({ photo: _photo, ...entry }) => entry) }
        : {},
  },
} as const satisfies Meta;

export const props = z.strictObject({
  ...variantProps(meta.variants),
  entries: z
    .array(z.strictObject({ who: text(20), photo, text: text(80), time: text(12), goto: screenId }))
    .min(1)
    .max(6),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const { placeholderDetail, placeholderValue } = wordsFor(lang);
  const seed = {
    who: placeholderTitle(0, lang),
    text: placeholderDetail,
    photo: "lib:people",
    time: placeholderValue,
    goto: "detail",
  };
  const entries = itemsOf(cast, 6, thing?.type).map((item, i) => ({
    ...seed,
    who: titleOf(item, 20, thing) ?? placeholderTitle(i, lang),
    text: detailOf(item, 80, thing) ?? placeholderDetail,
  }));
  return { entries: entries.length ? entries : [seed] };
}

export const examples = [
  {
    entries: [
      {
        who: "Ana",
        photo: "lib:people",
        text: "Watered the fern.",
        time: "09:10",
        goto: "fern",
      },
      {
        who: "Inez",
        photo: "lib:people",
        text: "Moved the rubber plant into the\u00a0study.",
        time: "08:45",
        goto: "rubber",
      },
    ],
  },
  {
    density: "compact",
    entries: [
      {
        who: "Sam",
        photo: "lib:people",
        text: "Switched Milo to the canal\u00a0loop.",
        time: "14:20",
        goto: "milo",
      },
      { who: "Noor", photo: "lib:people", text: "Logged Pip's first walk.", time: "13:50", goto: "pip" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("ActivityLog");
export const probes = [
  choose(
    "Audit edits by staff. Each row needs the actor's portrait and name, the edit they made, its timestamp, and a link to the changed record.",
  ),
  choose(
    "Lay out tomorrow's planned stops in time order, each with a time and one note. Nobody is editing records.",
    "Timeline",
  ),
  write(
    "Log that Ana marked the Boston fern as watered at 09:10. Use lib:people for the portrait and link to fern.",
  ),
  {
    ...write(
      "In the record change history, show that Ana marked the Boston fern as watered at 09:10 and link to fern. Keep the actor's lib:people portrait on file, but show the rows without portraits.",
    ),
    variant: { axis: "lead", value: "none" },
  },
  read("Open the record that Inez moved to the study.", { address: "s1/r2", action: "press" }),
] satisfies Probe[];

type LogProps = Props<typeof props, typeof meta>;
type Entry = LogProps["entries"][number];
type RowProps = { entry: Entry; density: LogProps["density"]; avatar: boolean };

function ActivityRow({ entry, density, avatar }: RowProps) {
  const { lang } = kit.useWords(dataWordsFor);
  const { resolvePhoto } = kit.useKit();
  const { id, who, photo, text, time, goto } = entry;
  // The library's generic people placeholder is not an actor's portrait.
  const portrait =
    avatar && photo !== "lib:people" && resolvePhoto?.(photo) ? { photo } : { initials: Array.from(who)[0]! };
  return (
    <kit.KitRow
      item={id}
      goto={goto}
      label={activityLabel(entry, lang)}
      density={density}
      leadingAlign="row"
      leading={avatar ? <kit.KitPhoto {...portrait} shape="round" label={who} part="photo" /> : undefined}
      trailing={<kit.KitIcon name="chevron_right" decorative />}
    >
      <kit.KitText part="who" emphasis="strong" density={density}>
        {who}
      </kit.KitText>
      <kit.KitText part="text" tone="muted" density={density}>
        {text}
      </kit.KitText>
      <kit.KitText part="time" role="caption" tone="muted" density={density} tabular>
        {time}
      </kit.KitText>
    </kit.KitRow>
  );
}

export function ActivityLog(input: LogProps) {
  const { entries } = input;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const avatar = kit.useVariant("lead", meta.variants.lead, input.lead) === "avatar";
  const state = kit.useComponentState();
  return (
    <kit.KitCard part="root" surface={surface} density={density}>
      {state === "empty" ? (
        <kit.KitEmpty icon="clipboard_list" part="title" decorativeIcon />
      ) : state === "loading" ? (
        <kit.KitSkeleton
          rows={entries.length}
          density={density}
          lead="none"
          items={entries.map(({ who, photo, text, time }) => ({
            ...(avatar ? { photo } : {}),
            trail: true,
            lines: [
              { role: "body", text: who },
              { role: "body", text },
              { role: "caption", text: time },
            ],
          }))}
        />
      ) : (
        entries.map((entry) => <ActivityRow key={entry.id} {...{ entry, density, avatar }} />)
      )}
    </kit.KitCard>
  );
}

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
  wordsFor,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
  variantProps,
  visibleItems,
} from "../../../catalog";
import * as kit from "../../../kit";
import { activityOptions, activityFilters, activityKinds, activityLive, activityReading } from "../copy";
import { dataWordsFor } from "../lang";
import * as optionView from "../option-views";
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
    lead: ["avatar", "none"],
  },
  variantParts: { "lead.none": { hides: ["photo"] } },
  parts: ["root", "title", "kind"],
  items: {
    key: "entries",
    parts: ["root", "who", "photo", "text", "time", "diff"],
    visibleWhen: { shown: true },
  },
  states: ["filled", "empty", "loading"],
  actions: { parts: { kind: ["select"] }, items: { root: ["press"] }, when: { kind: { hasKinds: true } } },
  selections: { kind: { prop: "kind", choices: { prop: "kindOptions" }, runtime: true } },
  live: { derive: activityLive },
  read: (input, state, lang): string[] =>
    state === "filled" ? activityReading(input as LogProps, lang) : [],
} as const satisfies Meta;

// prettier-ignore
export const props = z.strictObject({
  ...variantProps(meta.variants),
  kind: z.enum(activityFilters).optional(),
  entries: z.array(z.strictObject({
    who: text(20), photo, text: text(80), time: text(12), goto: screenId,
    kind: z.enum(activityKinds).optional(),
    diff: z.strictObject({ old: text(28), new: text(28) }).optional(),
  })).min(1).max(6),
}).refine(({ kind, entries }) => !kind || kind === "all" || entries.some((entry) => entry.kind === kind),
  { path: ["kind"], message: "The starting filter must match an entry" }).overwrite((input) => {
    const kindOptions = activityOptions(input.entries);
    return {
      ...input, kindOptions, hasKinds: kindOptions.length > 0,
      entries: input.entries.map((entry) => ({ ...entry, shown: !input.kind || input.kind === "all" || entry.kind === input.kind })),
    };
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
    kind: "all",
    entries: [
      {
        who: "Sam",
        photo: "lib:people",
        text: "Switched Milo to the canal\u00a0loop.",
        time: "14:20",
        goto: "milo",
        kind: "updated",
        diff: { old: "Park loop", new: "Canal loop" },
      },
      {
        who: "Noor",
        photo: "lib:people",
        text: "Logged Pip's first walk.",
        time: "13:50",
        goto: "pip",
        kind: "created",
      },
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
  {
    ...write(
      "In a change history, Ana updated the fern at 09:10 and Inez created the rubber plant record at 08:45. Use lib:people and links fern and rubber. Keep both records, tag their event categories, and preselect the Updated filter so the created event is hidden initially.",
    ),
    expectProps: { kind: "updated", entries: [{ kind: "updated" }, { kind: "created" }] },
  },
  {
    ...write(
      "Ana changed the fern's location at 09:10. Use lib:people, link to fern, and display the previous location Shade and the new location Sun on a change line.",
    ),
    expectProps: { entries: [{ diff: { old: "Shade", new: "Sun" } }] },
  },
] satisfies Probe[];

type LogProps = Props<typeof props, typeof meta>;
type Entry = LogProps["entries"][number];
// prettier-ignore
export function ActivityLog(input: LogProps) {
  const density = kit.useKit().density;
  const surface = "card";
  const avatar = kit.useVariant("lead", meta.variants.lead, input.lead) === "avatar";
  const live = kit.useLiveControls(meta, input);
  const entries = visibleItems(meta, live) as Entry[];
  const options = activityOptions(input.entries);
  const { words } = kit.useWords(dataWordsFor);
  const upgraded = options.length > 0 || input.entries.some(({ diff }) => diff);
  const rows = entries.map((entry) => <optionView.ActivityRow key={entry.id} {...{ entry, density, avatar, upgraded }} />);
  const feed = <kit.KitRowGroup density={density} separators={upgraded}
    leadingWidth={upgraded && avatar ? "avatar" : undefined}>{rows}</kit.KitRowGroup>;
  const body = upgraded ? <kit.KitContent inset="md" density={density}>
    {options.length > 0 && <kit.KitTrack look="segments" part="kind" role="radiogroup" label={words.activityKind}>
      {options.map(({ value, label }) => <kit.KitChip key={value} item={null} role="radio" look="segment"
        label={label} value={value} on={live.kind === value} />)}
    </kit.KitTrack>}
    {feed}
  </kit.KitContent> : feed;
  return <kit.KitCard part="root" surface={surface} density={density} padded={upgraded} inset={upgraded ? "none" : "md"}>
    <kit.KitState icon="clipboard_list" part="title" loading={feed} density={density}>
      {body}
    </kit.KitState>
  </kit.KitCard>;
}

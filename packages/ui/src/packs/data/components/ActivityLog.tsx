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
  visibleItems,
  wordsFor,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import * as kit from "../../../kit";
import { activityChoices, activityFilters, activityKinds, activityLive, activityReading } from "../copy";
import { dataWordsFor } from "../lang";
import { ActivityRow } from "../option-views";

// Core first: Timeline/default lays out events or plans; it does not identify who changed a record with avatars.
export const meta = {
  id: "ActivityLog",
  status: "ready",
  group: "data",
  purpose: "See who changed a shared record, what changed, and when it happened.",
  pick: "Audit changes by several people with actor portraits, times and links to changed records. Not scheduled events in time order (Timeline), one client's history (ClientHistory) or shift notes (Handover).",
  writeHints: [
    'Write the actor in who and the change in text, without repeating the actor in text. Keep the supplied timestamp and record link. Use lead "none" only when explicitly asked to hide portraits; still write photo for every entry.',
    'Store each event category in entries[].kind. Set top-level kind to a category only to start with that filter selected; retain all entries. Write before and after text as diff: {"old":"Shade","new":"Sun"} only when both are supplied.',
  ],
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
  { path: ["kind"], message: "The starting filter must match an entry" }).overwrite((input) => ({
    ...input, entries: input.entries.map((entry) => ({ ...entry, shown: !input.kind || input.kind === "all" || entry.kind === input.kind })),
  }));

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
    kind: "updated",
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
      "Show Ana's fern updates at 09:10 and Inez's new rubber plant at 08:45, using lib:people and links fern and rubber. Keep both entries but initially show only the updates.",
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
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const avatar = kit.useVariant("lead", meta.variants.lead, input.lead) === "avatar";
  const live = kit.useLiveControls(meta, input);
  const entries = visibleItems(meta, live) as Entry[];
  const options = activityChoices(input.entries);
  const { words } = kit.useWords(dataWordsFor);
  const upgraded = options.length > 0 || input.entries.some(({ diff }) => diff);
  const rows = entries.map((entry) => <ActivityRow key={entry.id} {...{ entry, density, avatar, upgraded }} />);
  const legacyLoading = <kit.KitSkeleton rows={entries.length} density={density} lead="none"
    items={entries.map(({ who, photo, text, time }) => ({
      ...(avatar ? { photo } : {}), trail: true,
      lines: [{ role: "body", text: who }, { role: "body", text }, { role: "caption", text: time }],
    }))} />;
  const feed = <kit.KitRowGroup density={density} separators={upgraded}
    leadingWidth={upgraded && avatar ? "avatar" : undefined}>{rows}</kit.KitRowGroup>;
  return <kit.KitCard part="root" surface={surface} density={density} padded={upgraded}>
    <kit.KitState icon="clipboard_list" part="title" loading={upgraded ? feed : legacyLoading} density={density}>
      {options.length > 0 && <kit.KitTrack part="kind" role="radiogroup" label={words.activityKind}>
        {options.map((kind) => <kit.KitChip key={kind} item={null} role="radio"
          label={words.activityKinds[kind]} value={kind} on={live.kind === kind} />)}
      </kit.KitTrack>}
      {feed}
    </kit.KitState>
  </kit.KitCard>;
}

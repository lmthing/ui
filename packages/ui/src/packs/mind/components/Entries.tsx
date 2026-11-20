import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { entryMonth, entryMonths, entryTags } from "../copy";
import { mindWordsFor } from "../lang";

// Core first: List/cards cannot pair a dated journal excerpt with a mood face, tags and a thumbnail.
export const meta = {
  id: "Entries",
  status: "ready",
  group: "content",
  purpose: "Revisit personal journal entries grouped by month, newest first.",
  pick: "A feed of past personal journal entries with dates, mood faces, excerpts, tags and optional thumbnails. Not general tappable rows (List), posts by other people (Feed), or saved passages from books (Highlights).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Journal entries are stored only on the device.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["tags"] } },
  parts: ["root", "month", "empty"],
  items: { key: "entries", parts: ["root", "date", "mood", "text", "tags", "photo"] },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
  writeHints: [
    "Use real dates in YYYY-MM-DD, newest first. Each entry needs a goto screen id; when fewer than three tags are known, provide only those tags.",
    'Use detail null when tags should be visible, including whenever the journal brief names tags to show. Use detail "brief" only when explicitly asked to hide tags. Write null for unrequested density and surface; never fill in default variant names.',
  ],
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { entries, detail } = input as z.output<typeof props>;
    const words = mindWordsFor(lang);
    return entries.flatMap(({ date, tags, mood }, index) => [
      ...(index === 0 || entries[index - 1]!.date.slice(0, 7) !== date.slice(0, 7)
        ? [entryMonth(date, lang)]
        : []),
      [
        `r${index + 1}`,
        c.appointmentDate(date, lang),
        mood === undefined ? "" : words.entryMood[mood - 1],
        detail === "brief" ? "" : entryTags(tags, lang),
      ]
        .filter(Boolean)
        .join(" · "),
    ]);
  },
} as const satisfies c.Meta;

const entry = z.strictObject({
  date: c.isoDate,
  mood: z.int().min(1).max(5).optional(),
  text: c.text(160),
  tags: z.array(c.text(12)).min(0).max(3),
  photo: c.photo.optional(),
  goto: c.screenId,
});

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    entries: z.array(entry).min(1).max(6),
  })
  .overwrite((value) => ({
    ...value,
    entries: [...value.entries].sort((left, right) => right.date.localeCompare(left.date)),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const entries = c.itemsOf(cast, 6).map((item, index) => {
    const values = c.textsOf(item, thing);
    const date = values.find((value) => c.isoDate.safeParse(value).success);
    const text = values.find((value) => value !== date);
    return {
      date: date ?? "1970-01-01",
      text: text ? c.clip(text, 160) : c.placeholderTitle(index, lang),
      tags: [],
      goto: c.screenId.safeParse(item.id).data ?? "entry",
    };
  });
  return {
    entries: entries.length
      ? entries
      : [{ date: "1970-01-01", text: c.wordsFor(lang).placeholderDetail, tags: [], goto: "entry" }],
  };
}

// prettier-ignore
export const examples = [
  { entries: [
    { date: "2026-11-19", mood: 4, text: "A walk helped me feel calmer.",
      tags: ["Outdoors", "Morning"], photo: "lib:parks", goto: "nov_19" },
    { date: "2026-11-04", mood: 3, text: "I put my phone away early to write.",
      tags: ["Evening"], goto: "nov_04" },
  ] },
  { entries: [
    { date: "2026-10-02", text: "I took my time over breakfast.",
      tags: [], goto: "oct_02" },
    { date: "2026-09-29", mood: 5, text: "I laughed on the way home.",
      tags: ["Friends"], goto: "sep_29" },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Entries");
export const probes = [
  choose(
    "Show my past journal reflections, newest first by month, with a mood face, a little text, tags and an optional photo for each.",
  ),
  choose(
    "Show several saved notebooks as tappable rows with just a name and a chevron, no dates or excerpts.",
    "List",
  ),
  write(
    "One reflection dated 2026-11-19: I felt calmer after walking. Mood four, tag Outdoors, tap to open nov_19.",
  ),
  {
    ...write(
      "Show my 2026-11-19 journal reflection ‘I felt calmer after walking’ with its date and excerpt but hide the tags. Tap it to open nov_19.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the reflection about putting my phone away early.", { address: "e1/r2", action: "press" }),
] satisfies c.Probe[];

type EntriesProps = c.Props<typeof props, typeof meta>;

// prettier-ignore
function EntryRow({ entry, density }: { entry: EntriesProps["entries"][number]; density: c.ThemeDensity }) {
  const { lang, words } = kit.useWords(mindWordsFor);
  const { id, date, mood, tags, photo, text, goto } = entry;
  const day = c.appointmentDate(date, lang);
  const loading = kit.useComponentState() === "loading";
  const skeleton = words.entrySkeleton;
  const face = <kit.KitScaleTrack style="mood" value={mood ?? 0} labels={words.entryMood} readonly single part="mood" />;
  const target = loading ? { part: null, label: "" } : { item: id, part: "root", goto, label: words.entryLabel(day, text) };
  return <kit.KitRow {...target} leading={face} lineRole="heading" {...{ density }}>
    <kit.KitGrid fitLast {...{ density }}>
      {loading
        ? <kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[
            ["label", skeleton.date], ["body", skeleton.excerpt], ["label", tags.length ? skeleton.tags : undefined],
          ]} />
        : <kit.KitContent {...{ density }}>
            <kit.KitText {...{ density }} part="date" role="label" tone="muted" lines={1}>{day}</kit.KitText>
            <kit.KitText {...{ density }} part="text" lines={2}>{text}</kit.KitText>
            {tags.length > 0 && <kit.KitText {...{ density }} part="tags" role="label" tone="muted">{entryTags(tags, lang)}</kit.KitText>}
          </kit.KitContent>}
      {photo && (loading
        ? <kit.KitSkeleton shape="control" kind="secondary" label={c.wordsFor(lang).placeholderValue} />
        : <kit.KitPhoto photo={photo} part="photo" shape="thumb" ring="muted" label={words.entryPhoto} />)}
    </kit.KitGrid>
  </kit.KitRow>;
}

// prettier-ignore
export function Entries(input: EntriesProps) {
  const { entries, surface, density: askedDensity } = input;
  const density = kit.useVariant("density", meta.variants.density, askedDensity);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const state = kit.useComponentState();
  const { lang, words } = kit.useWords(mindWordsFor);
  const { thing } = kit.usePartContext();
  const skeleton = words.entrySkeleton;
  return <kit.KitCard part="root" padded inset="none" {...{ surface, density }}>
    {state === "empty" ? <kit.KitEmpty part="empty" title={thing ? c.emptyLine(thing, lang) : words.entriesEmpty} decorativeIcon />
      : entryMonths(entries).map(({ month, entries: group }, index) => {
        const rows = detail === "brief" ? group.map((row) => ({ ...row, tags: [] })) : group;
        const heading = entryMonth(rows[0]!.date, lang);
        return <kit.KitContent key={month} group={index ? "response" : "content"} {...{ density }}>
          <kit.KitContent inset="md" {...{ density }}>
            {state === "loading"
              ? <kit.KitSkeleton shape="figure" inset="none" content={[["heading", skeleton.month]]} density="comfortable" />
              : <kit.KitText part={index ? null : "month"} role="heading" density="comfortable">{heading}</kit.KitText>}
          </kit.KitContent>
          <kit.KitGrid list={state !== "loading"} arrange="rows" {...{ density }}>
            {rows.map((entry) => <EntryRow key={entry.id} {...{ entry, density }} />)}
          </kit.KitGrid>
        </kit.KitContent>;
      })}
  </kit.KitCard>;
}

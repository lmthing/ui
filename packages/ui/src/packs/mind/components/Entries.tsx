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
  parts: ["root", "month", "empty", "prompt"],
  items: { key: "entries", parts: ["root", "date", "mood", "text", "tags", "photo"] },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
  writeHints: [
    "Use real dates in YYYY-MM-DD, newest first. Each entry needs a goto screen id; when fewer than three tags are known, provide only those tags.",
    'Use detail null when tags should be visible, including whenever the journal brief names tags to show. Use detail "brief" only when explicitly asked to hide tags. Write null for unrequested density and surface; never fill in default variant names.',
    'Use style "compact" for a one-line excerpt without thumbnails; density sets spacing only. Keep any source photos in entries. Leave style null for the ordinary two-line feed, and supply prompt only if a shared journal prompt badge is requested.',
  ],
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { entries, detail, prompt } = input as z.output<typeof props>;
    const words = mindWordsFor(lang);
    return [
      ...(prompt ? [JSON.stringify(prompt)] : []),
      ...entries.flatMap(({ date, tags, mood }, index) => [
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
      ]),
    ];
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
    style: z.enum(["feed", "compact"]).default("feed"),
    prompt: c.text(24).optional(),
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
  { style: "compact", prompt: "Small joys", entries: [
    { date: "2026-10-02", text: "I took my time over breakfast.",
      tags: [], photo: "lib:parks", goto: "oct_02" },
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
  {
    ...write(
      "Show a journal entry dated 2026-11-19, ‘I felt calmer after walking’, linking to nov_19. Use the layout with one line of excerpt per entry and no thumbnails.",
    ),
    expectProps: { style: "compact" },
  },
  {
    ...write(
      "Show my journal entry ‘I took my time over breakfast’ dated 2026-10-02, linking to oct_02. Above the journal list, show the shared prompt badge ‘Small joys’.",
    ),
    expectProps: { prompt: "Small joys" },
  },
] satisfies c.Probe[];

type EntriesProps = c.Props<typeof props, typeof meta>;

// prettier-ignore
function EntryRow({ entry, density, compact }: { entry: EntriesProps["entries"][number]; density: c.ThemeDensity; compact: boolean }) {
  const { lang, words } = kit.useWords(mindWordsFor);
  const { id, date, mood, tags, photo, text, goto } = entry;
  const day = c.appointmentDate(date, lang);
  const loading = kit.useComponentState() === "loading";
  const skeleton = words.entrySkeleton;
  const face = <kit.KitScaleTrack style="mood" value={mood ?? 0} labels={words.entryMood} readonly single part={loading ? null : "mood"} />;
  const target = loading ? { part: null, label: "" } : { part: "root", goto, label: words.entryLabel(day, text) };
  const thumbnail = photo && !compact
    ? <kit.KitPhoto photo={photo} part={loading ? null : "photo"} loading={loading} shape="thumb" ring="muted" label={words.entryPhoto} />
    : undefined;
  return <kit.KitRow item={id} {...target} leading={face} trailing={thumbnail} inset="none" lineRole="heading" density={density}>
    <kit.KitMetaLine density={density}
      title={{ part: "date", role: "meta", tone: "muted", text: loading ? skeleton.date : day, lines: 1 }}
      meta={[
        { part: "text", role: "body", tone: "text", text: loading ? skeleton.excerpt : text, lines: compact ? 1 : 2 },
        { part: "tags", text: tags.length ? (loading ? skeleton.tags : entryTags(tags, lang)) : undefined },
      ]} />
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
  const groups = entryMonths(entries).map(({ month, entries: group }, index) => {
        const rows = detail === "brief" ? group.map((row) => ({ ...row, tags: [] })) : group;
        const heading = state === "loading" ? words.entrySkeleton.month : entryMonth(rows[0]!.date, lang);
        return <kit.KitContent key={month} group={index ? "response" : "content"} {...{ density }}>
          <kit.KitHeader title={{ text: heading, part: index ? null : "month" }} density="comfortable" />
          <kit.KitRowGroup density={density}>
            {rows.map((entry) => <EntryRow key={entry.id} {...{ entry, density }} compact={input.style === "compact"} />)}
          </kit.KitRowGroup>
        </kit.KitContent>;
  });
  const content = <kit.KitContent density={density}>
    {input.prompt && <kit.KitContent lead={<kit.KitTrail kind="badge" part="prompt" value={state === "loading" ? words.entrySkeleton.prompt : input.prompt} />}><></></kit.KitContent>}
    {groups}
  </kit.KitContent>;
  return <kit.KitCard part="root" padded {...{ surface, density }}>
    <kit.KitState loading={content} part="empty" message={thing ? c.emptyLine(thing, lang) : words.entriesEmpty} density={density}>
      {content}
    </kit.KitState>
  </kit.KitCard>;
}

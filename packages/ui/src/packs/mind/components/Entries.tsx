import { z } from "zod";
import * as c from "../../../catalog";

// Core first: List/cards cannot pair a dated journal excerpt with a mood face, tags and a thumbnail.
export const meta = {
  id: "Entries",
  status: "draft",
  group: "content",
  purpose: "Revisit personal journal entries grouped by month, newest first.",
  pick: "A feed of past personal journal entries with dates, mood faces, excerpts, tags and optional thumbnails. Not general tappable rows (List), posts by other people (Feed), or saved passages from books (Highlights).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Journal entries are stored only on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root", "month"],
  items: { key: "entries", parts: ["root", "date", "mood", "text", "tags", "photo"] },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
  writeHints: [
    "Use real dates in YYYY-MM-DD, newest first. Each entry needs a goto screen id; when fewer than three tags are known, provide only those tags.",
  ],
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { entries } = input as z.output<typeof props>;
    return entries.map(({ date, tags, mood }, index) =>
      [
        `r${index + 1}`,
        c.appointmentDate(date, lang),
        mood === undefined ? "" : c.numberLine(mood, lang),
        ...tags.map((tag) => JSON.stringify(tag)),
      ]
        .filter(Boolean)
        .join(" · "),
    );
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

export const examples = [
  {
    entries: [
      {
        date: "2026-11-19",
        mood: 4,
        text: "Took a walk before work. I felt more settled by the time I sat down.",
        tags: ["Outdoors", "Morning"],
        photo: "lib:parks",
        goto: "nov_19",
      },
      {
        date: "2026-11-04",
        mood: 3,
        text: "I put my phone away early and wrote until the room went quiet.",
        tags: ["Evening"],
        goto: "nov_04",
      },
    ],
  },
  {
    density: "compact",
    surface: "outlined",
    entries: [
      {
        date: "2026-10-02",
        text: "A slow breakfast gave me time to notice what I was looking forward to.",
        tags: [],
        goto: "oct_02",
      },
      {
        date: "2026-09-29",
        mood: 5,
        text: "I laughed easily on the way home today.",
        tags: ["Friends"],
        goto: "sep_29",
      },
    ],
  },
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
  read("Open the reflection about putting my phone away early.", { address: "e1/r2", action: "press" }),
] satisfies c.Probe[];

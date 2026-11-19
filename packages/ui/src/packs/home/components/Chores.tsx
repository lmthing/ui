import {
  wordsFor,
  isoDate,
  itemsOf,
  photo,
  placeholderTitle,
  probesFor,
  repeatOptions,
  screenId,
  text,
  thingOf,
  titleOf,
  detailOf,
  type FallbackInput,
  type Meta,
  type Probe,
} from "../../../catalog";
import { homeWordsFor } from "../lang";
import { z } from "zod";

// Core first: Checklist/default ticks today's jobs, not owners, repeats and earned points.
export const meta = {
  id: "Chores",
  status: "draft",
  group: "input",
  purpose: "Share recurring household jobs with owners and points earned for completing them.",
  pick: "Shared household jobs with an owner, a repeat and optional points. Not one person's jobs today (Checklist), staff shifts (Shift), or recurring care for a pet or plant (CareSchedule).",
  writeHints: [
    "Write last completion, repeat and every, never next due, overdue or done-for-now. Completion awards points and advances the due date in code.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { done: "people" },
  realPath: "Chores stay on the device; each person ticking their own on another phone needs a shared app.",
  items: { key: "chores", parts: ["root", "title", "who", "photo", "repeat", "last", "points", "done"] },
  parts: ["root"],
  states: ["filled", "empty", "success"],
  actions: { items: { done: ["check"], root: ["press"] } },
  read: (input, state, lang?: string) => {
    const { repeatLabels } = wordsFor(lang);
    const { choreLabels } = homeWordsFor(lang);
    return state === "filled"
      ? (input as z.output<typeof props>).chores.map(
          (row) =>
            `${row.title} · ${row.who} · ${row.every} ${repeatLabels[row.repeat]}${row.points === undefined ? "" : ` · ${row.points} ${choreLabels.points}`}`,
        )
      : [];
  },
} as const satisfies Meta;

export const props = z.strictObject({
  chores: z
    .array(
      z.strictObject({
        title: text(28),
        who: text(16),
        photo: photo.optional(),
        repeat: z.enum(repeatOptions),
        every: z.int().min(1).max(12),
        last: isoDate.optional(),
        points: z.number().min(0).max(100).optional(),
        goto: screenId,
      }),
    )
    .min(1)
    .max(6),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast),
    items = itemsOf(cast, 6);
  return {
    chores: (items.length ? items : [undefined]).map((item, index) => ({
      title: item
        ? (titleOf(item, 28, thing) ?? placeholderTitle(index, lang))
        : placeholderTitle(index, lang),
      who: item
        ? (detailOf(item, 16, thing) ?? placeholderTitle(index, lang))
        : placeholderTitle(index, lang),
      repeat: "weekly",
      every: 1,
      goto: item && screenId.safeParse(item.id).success ? item.id : "detail",
    })),
  };
}
export const examples = [
  {
    chores: [
      {
        title: "Mist the fern",
        who: "Sam",
        photo: "lib:people",
        repeat: "daily",
        every: 1,
        last: "2026-11-18",
        points: 5,
        goto: "fern",
      },
    ],
  },
  {
    chores: [
      {
        title: "Wash Clover's bowl",
        who: "Alex",
        photo: "lib:people",
        repeat: "weekly",
        every: 2,
        last: "2026-11-15",
        points: 10,
        goto: "clover",
      },
    ],
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Chores");
export const probes = [
  choose("Shared household jobs with who does each, how often, last done and points for ticking them"),
  choose("Tick off my own three jobs today, without repeats, owners or points", "Checklist"),
  write("Sam mists the fern every day, last done 18 November 2026, earns five points, opens fern details"),
  read("Mark Sam's misting job done", { address: "c1/r1/done", action: "check" }),
] satisfies Probe[];

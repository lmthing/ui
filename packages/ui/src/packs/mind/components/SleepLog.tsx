import { z } from "zod";
import * as c from "../../../catalog";
import { mindWordsFor } from "../lang";

// Core first: Timeline/hours lays out events, not overnight sleep versus awake time, quality and a weekly average.
export const meta = {
  id: "SleepLog",
  status: "draft",
  group: "data",
  purpose: "Review last night's sleep, its quality and the week's average.",
  pick: "One night's bedtime and wake time with an asleep versus awake bar, quality face and weekly sleep average. Not a schedule of timed events (Timeline) or one rating alone (Scale).",
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { import: "ok" },
  realPath: "Sleep times are typed in or read from the phone's sleep data with permission.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root", "bed", "wake", "duration", "night", "quality", "average", "edit", "import"],
  states: ["filled", "empty"],
  actions: { parts: { edit: ["press"] } },
  emptyActions: ["edit.press"],
  writeHints: [
    "Use 24-hour HH:MM for bed and wake. Awake minutes cannot exceed the interval from bed to wake across midnight. If supplied, week contains exactly seven hours values from 0 to 24; never write duration or average.",
  ],
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { bed, wake, awake, quality, week } = input as z.output<typeof props>;
    return [
      c.timeOfDayLine(bed, lang),
      c.timeOfDayLine(wake, lang),
      c.durationLine(nightMinutes(bed, wake) - (awake ?? 0), lang),
      ...(quality === undefined ? [] : [c.numberLine(quality, lang)]),
      ...(week
        ? [c.durationLine(Math.round((week.reduce((sum, hours) => sum + hours, 0) * 60) / week.length), lang)]
        : []),
      JSON.stringify(mindWordsFor(lang).editSleep),
    ];
  },
} as const satisfies c.Meta;

function nightMinutes(bed: string, wake: string): number {
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  return (minutes(wake) - minutes(bed) + 1440) % 1440;
}

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    bed: c.clock,
    wake: c.clock,
    awake: z.int().min(0).max(1439).optional(),
    quality: z.int().min(1).max(5).optional(),
    week: z.array(z.number().min(0).max(24)).min(7).max(7).optional(),
    goto: c.screenId,
  })
  .refine(({ bed, wake, awake }) => awake === undefined || awake <= nightMinutes(bed, wake), {
    path: ["awake"],
    message: "Awake minutes cannot exceed the time between bed and wake",
  });

export function fallback({ cast }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const item = c.itemsOf(cast, 1)[0];
  const times = item ? c.textsOf(item, thing).filter((value) => c.clock.safeParse(value).success) : [];
  return { bed: times[0] ?? "00:00", wake: times[1] ?? times[0] ?? "00:00", goto: "sleep_log" };
}

export const examples = [
  {
    bed: "22:45",
    wake: "06:45",
    awake: 30,
    quality: 4,
    week: [7, 7.5, 8, 6.5, 7, 8, 7.5],
    goto: "sleep_log",
  },
  { density: "compact", surface: "outlined", bed: "23:15", wake: "07:20", goto: "sleep_log" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("SleepLog");
export const probes = [
  choose(
    "Show how last night went: when I went to bed and woke, a bar for time asleep versus awake, a quality face, and my average over the week.",
  ),
  choose(
    "Lay out tomorrow's timed activities from 8 AM to 8 PM in chronological order, not last night's sleep.",
    "Timeline",
  ),
  write(
    "Last night's bedtime 22:45 and wake time 06:45, with 30 minutes awake, quality four, and seven nights at 7, 7.5, 8, 6.5, 7, 8 and 7.5 hours. Edit goes to sleep_log.",
  ),
  read("Open the screen where I can edit last night's sleep times.", { address: "s1/edit", action: "press" }),
] satisfies c.Probe[];

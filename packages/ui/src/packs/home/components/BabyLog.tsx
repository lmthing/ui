import { z } from "zod";
import {
  clock,
  durationLine,
  probesFor,
  text,
  timerLabels,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";
import { babyLabels } from "../copy";

// Core first: Timer/down times one task, not feed/nappy/sleep tiles and a baby's daily log.
export const meta = {
  id: "BabyLog",
  status: "draft",
  group: "input",
  purpose: "Quickly log a baby's feeds, nappies and sleeps and time an active feed or sleep.",
  pick: "Baby feeds, nappies and sleeps with quick tiles, an active timer and today's log. Not timing one thing (Timer), adult habits (HabitGrid), or a general care history (Timeline).",
  writeHints: [
    "log has 0–12 entries. Write kind, HH:MM time and optional minutes/amount; never time-since-last. running is none or one kind, not a boolean.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Baby entries and running timers stay on the device; two parents sharing need a shared app.",
  items: { key: "entries", parts: ["root", "kind", "time", "minutes", "amount"] },
  parts: ["root", "running"],
  states: ["filled", "empty"],
  actions: {
    items: { root: ["start", "stop", "press"] },
    when: {
      "root.start": { entryKind: "tile", active: false },
      "root.stop": { entryKind: "tile", active: true },
      "root.press": { entryKind: "log" },
    },
  },
  read: (input, state) => {
    if (state !== "filled") return [];
    const { log, running, entries } = input as z.output<typeof props> & { entries: { id?: string }[] };
    return [
      babyLabels[running],
      ...kinds.map(
        (kind, index) =>
          `${entries[index]?.id ?? ""} ${babyLabels[kind]} · ${running === kind ? timerLabels.stop : timerLabels.start}`,
      ),
      ...log.map(
        (entry, index) =>
          `${entries[kinds.length + index]?.id ?? ""} ${babyLabels[entry.kind]} · ${entry.time}${entry.minutes === undefined ? "" : ` · ${durationLine(entry.minutes)}`}${entry.amount ? ` · ${entry.amount}` : ""}`,
      ),
    ];
  },
} as const satisfies Meta;
const kinds = ["feed_left", "feed_right", "bottle", "nappy", "sleep"] as const;
export const props = z
  .strictObject({
    log: z
      .array(
        z.strictObject({
          kind: z.enum(kinds),
          time: clock,
          minutes: z.number().min(0).optional(),
          amount: text(10).optional(),
        }),
      )
      .min(0)
      .max(12),
    running: z.enum(["none", ...kinds]).default("none"),
  })
  .overwrite((value) => ({
    ...value,
    entries: [
      ...kinds.map((kind) => ({ kind, entryKind: "tile", active: value.running === kind })),
      ...value.log.map((entry) => ({ ...entry, entryKind: "log" })),
    ],
  }));
export function fallback(_input: { cast: CastLike }): z.input<typeof props> {
  return { log: [], running: "none" };
}
export const examples = [
  {
    log: [
      { kind: "feed_left", time: "07:30", minutes: 12 },
      { kind: "nappy", time: "08:00" },
      { kind: "bottle", time: "09:00", amount: "90 ml" },
    ],
    running: "sleep",
  },
  {
    log: [
      { kind: "feed_right", time: "06:45", minutes: 10 },
      { kind: "sleep", time: "07:00", minutes: 45 },
    ],
    running: "none",
  },
  { log: [], running: "none" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("BabyLog");
export const probes = [
  choose("Quick baby feeding, nappy and sleep tiles, a running feed or sleep timer and today's log"),
  choose("Count down five minutes for one task, no baby log or quick-entry tiles", "Timer"),
  write(
    "Baby fed left at 07:30 for twelve minutes, nappy at 08:00, bottle at 09:00 with 90 ml, sleep is currently running",
  ),
  read("Stop the baby's running sleep timer", { address: "b1/r5", action: "stop" }),
  read("Start a left-side feed", { address: "b1/r1", action: "start" }),
  read("Open the feed recorded at 07:30", { address: "b1/r6", action: "press" }),
] satisfies Probe[];

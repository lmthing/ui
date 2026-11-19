import { z } from "zod";
import {
  icon,
  isoDate,
  itemsOf,
  placeholderTitle,
  probesFor,
  repeatLabels,
  repeatOptions,
  screenId,
  text,
  thingOf,
  titleOf,
  detailOf,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";
import { careLabels } from "../copy";

// Core first: Checklist/default cannot advance recurring care from the last completion date.
export const meta = {
  id: "CareSchedule",
  status: "draft",
  group: "input",
  purpose: "Keep recurring care for pets, plants, cars or a house and log each completion.",
  pick: "Recurring care with last completion and code-derived next due dates. Not today's one-off jobs (Checklist), shared household points (Chores), a person's medicine (Medication), or provider appointments (Appointment).",
  writeHints: [
    "Write last, repeat and every. Next due, overdue and due-today are computed; never write them. Repeat uses the same enum as Field.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  signature: "check_burst",
  realPath: "Care tasks and completion logs stay on the device; notification reminders need permission.",
  items: { key: "tasks", parts: ["root", "title", "for", "icon", "repeat", "last", "done"] },
  parts: ["root"],
  states: ["filled", "empty", "success"],
  actions: { items: { done: ["press"], root: ["press"] } },
  read: (input, state) =>
    state === "filled"
      ? (input as z.output<typeof props>).tasks.map(
          (row) =>
            `${row.title}${row.for ? ` · ${row.for}` : ""} · ${row.every} ${repeatLabels[row.repeat]} · ${careLabels.last} ${row.last}`,
        )
      : [],
} as const satisfies Meta;
export const props = z.strictObject({
  tasks: z
    .array(
      z.strictObject({
        title: text(24),
        for: text(16).optional(),
        icon,
        repeat: z.enum(repeatOptions),
        every: z.int().min(1).max(12),
        last: isoDate,
        goto: screenId,
      }),
    )
    .min(1)
    .max(12),
});
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast),
    items = itemsOf(cast, 12);
  return {
    tasks: (items.length ? items : [undefined]).map((item, index) => ({
      title: item ? (titleOf(item, 24, thing) ?? placeholderTitle(index)) : placeholderTitle(index),
      ...(item && detailOf(item, 16, thing) ? { for: detailOf(item, 16, thing) } : {}),
      icon: "check",
      repeat: "weekly",
      every: 1,
      last: new Date(0).toISOString().slice(0, 10),
      goto: item && screenId.safeParse(item.id).success ? item.id : "detail",
    })),
  };
}
export const examples = [
  {
    tasks: [
      {
        title: "Water",
        for: "Fern",
        icon: "leaf",
        repeat: "weekly",
        every: 1,
        last: "2026-11-12",
        goto: "fern",
      },
      {
        title: "Feed",
        for: "Monstera",
        icon: "leaf",
        repeat: "weekly",
        every: 2,
        last: "2026-11-05",
        goto: "monstera",
      },
    ],
  },
  {
    tasks: [
      {
        title: "Flea treatment",
        for: "Clover",
        icon: "heart",
        repeat: "monthly",
        every: 1,
        last: "2026-10-19",
        goto: "clover",
      },
    ],
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("CareSchedule");
export const probes = [
  choose("Water and feed plants on repeats, show last done and next due, and log completion"),
  choose("Tick today's three one-off jobs, no repeats or care history", "Checklist"),
  write(
    "Water the fern weekly, last done 12 November 2026, and feed Monstera every two weeks, last done 5 November 2026, each opens its own details",
  ),
  read("Log that I watered the fern", { address: "c1/r1/done", action: "press" }),
] satisfies Probe[];

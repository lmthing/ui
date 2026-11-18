import { z } from "zod";
import { text, type CastLike, type Meta, type Probe, type Props } from "../catalog";
import { KitCard, KitContent, KitDay, KitText, KitWeekGrid } from "../kit";

export const meta = {
  id: "Calendar",
  signature: "calendar_sweep",
  group: "data",
  purpose: "See which dates have something planned and open a day.",
  pick: "Days of a week or month, with dates marked for planned activity. Not events with times in order (Timeline) or separate things to browse (List).",
  region: "body",
  weight: 3,
  tier: "phone",
  realPath: "Dates with activity queried from the on-device database, with a locally selected day.",
  items: { key: "marked", parts: ["root", "label"] },
  parts: ["root", "month"],
  states: ["filled"],
  actions: { items: { root: ["select"] } },
  aliases: ["dates", "monthgrid", "weekgrid", "daypicker"],
  read: (value): string[] => {
    const { marked } = value as { marked: { id: string; day: number; mark?: string }[] };
    return marked.map((day) => `${day.id}: ${day.day}${day.mark ? ` (${day.mark})` : ""}`);
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    style: z.enum(["week", "month"]).default("week"),
    month: text(16),
    marked: z
      .array(
        z
          .strictObject({
            day: z.int().min(1).max(31),
            tone: z.enum(["neutral", "good", "warn", "bad"]).default("neutral"),
          })
          .transform((day) => ({ ...day, mark: day.tone as typeof day.tone | undefined })),
      )
      .min(0)
      .max(12),
    selected: z.int().min(1).max(31).optional(),
    start: z.int().min(1).max(7).default(1),
    days: z.int().min(28).max(31).default(30),
  })
  .refine(
    ({ marked, selected, days }) => marked.every((mark) => mark.day <= days) && (selected ?? 1) <= days,
    {
      message: "Dates must exist in this month",
    },
  )
  .refine(({ marked }) => new Set(marked.map((mark) => mark.day)).size === marked.length, {
    path: ["marked"],
    message: "Mark each date only once",
  })
  // Expand only validated input into visible day items, so every drawn day has a stamped select address.
  .overwrite((value) => {
    const anchor = value.selected ?? value.marked[0]?.day ?? 1;
    const week = Math.floor((value.start - 1 + anchor - 1) / 7);
    const first = value.style === "month" ? 1 : Math.max(1, week * 7 - value.start + 2);
    const last =
      value.style === "month" ? value.days : Math.min(value.days, (week + 1) * 7 - value.start + 1);
    return {
      ...value,
      marked: Array.from({ length: last - first + 1 }, (_, index) => {
        const day = first + index;
        const source = value.marked.find((mark) => mark.day === day);
        return { day, tone: source?.tone ?? "neutral", mark: source?.mark };
      }),
    };
  });

export function fallback(_context: { cast: CastLike }): z.input<typeof props> {
  return { month: "This month", marked: [] };
}

export const examples = [
  {
    style: "month",
    month: "June 2026",
    start: 1,
    days: 30,
    selected: 12,
    marked: [
      { day: 5, tone: "good" },
      { day: 12, tone: "good" },
      { day: 19, tone: "good" },
      { day: 26, tone: "good" },
    ],
  },
  {
    style: "week",
    month: "June 2026",
    marked: [{ day: 8 }, { day: 9, tone: "good" }, { day: 10, tone: "warn" }, { day: 12, tone: "bad" }],
    selected: 10,
  },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "Show June's dates with dots on the days I need to water plants, and let me open a day",
    expect: "Calendar",
  },
  {
    kind: "choose",
    need: "Show today's walks in time order: 09:00 park, 12:30 lunch, 17:00 river",
    expect: "Timeline",
  },
  {
    kind: "write",
    brief:
      "June 2026, a full month of dates, with watering planned on the 5th, 12th, 19th and 26th marked good. Open the 12th initially.",
    expect: "Calendar",
  },
  { kind: "read", screen: 0, task: "Open the 12th", expect: { address: "c1/r12", action: "select" } },
] satisfies Probe[];

export function Calendar({ month, marked, selected, start }: Props<typeof props, typeof meta>) {
  const blanks = (start - 1 + (marked[0]?.day ?? 1) - 1) % 7;
  const cells = [
    ...Array.from({ length: blanks }, () => null),
    ...marked.map((day) => (
      <KitDay
        key={day.id}
        item={day.id}
        label={String(day.day)}
        name={`${month} ${day.day}`}
        selected={selected === day.day}
        mark={day.mark}
      />
    )),
  ];
  return (
    <KitCard style="plain" part="root">
      <KitContent lineRole="heading">
        <KitText role="heading" part="month" lines={1}>
          {month}
        </KitText>
        <KitWeekGrid cells={cells} />
      </KitContent>
    </KitCard>
  );
}

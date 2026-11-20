import { z } from "zod";
import {
  itemVariantProps,
  numberLine,
  wordsFor,
  probesFor,
  text,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { useVariant, useWords, KitCard, KitContent, KitDay, KitText, KitWeekGrid } from "../kit";

export const meta = {
  id: "Calendar",
  signature: "calendar_sweep",
  group: "data",
  purpose: "See which dates have something planned and open a day.",
  pick: "Days of a week or month, with dates marked for planned activity. Not events with times in order (Timeline) or separate things to browse (List).",
  writeHints: [
    'Write JSON null for an unrequested emphasis or day tone. Never write emphasis "normal" just to apply the default. Use "quiet" only for an explicitly subdued month heading. A dot without a requested status needs only the day.',
  ],
  region: "body",
  weight: 3,
  tier: "phone",
  realPath: "Dates with activity queried from the on-device database, with a locally selected day.",
  variants: { emphasis: ["normal", "quiet"] },
  items: { key: "marked", parts: ["root", "label"], variants: { tone: ["neutral", "good", "warn", "bad"] } },
  select: { prop: "selected", value: { field: "day" } },
  parts: ["root", "month"],
  states: ["filled"],
  actions: { items: { root: ["select"] } },
  read: (value, _state, lang?: string): string[] => {
    const { marked } = value as { marked: { id: string; day: number; mark?: string }[] };
    return marked.map((day) => `${day.id}: ${numberLine(day.day, lang)}${day.mark ? ` (${day.mark})` : ""}`);
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    style: z.enum(["week", "month"]).default("week"),
    month: text(16),
    marked: z
      .array(
        z
          .strictObject({
            day: z.int().min(1).max(31),
            ...itemVariantProps(meta.items.variants),
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

export function fallback({ lang }: FallbackInput): z.input<typeof props> {
  return { month: wordsFor(lang).thisMonth, marked: [] };
}

export const examples = [
  {
    style: "month",
    month: "June 2026",
    start: 1,
    days: 30,
    selected: 12,
    marked: [{ day: 5 }, { day: 12 }, { day: 19 }, { day: 26 }],
  },
  {
    style: "week",
    month: "June 2026",
    marked: [{ day: 12 }],
    selected: 10,
  },
  { month: "June 2026", marked: [{ day: 12 }], selected: 10, emphasis: "quiet" },
  { month: "June 2026", marked: [{ day: 12, tone: "good" }], selected: 10 },
  { month: "June 2026", marked: [{ day: 12, tone: "warn" }], selected: 10 },
  { month: "June 2026", marked: [{ day: 12, tone: "bad" }], selected: 10 },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Calendar");
export const probes = [
  choose("Show June's dates with dots on the days I need to water plants, and let me open a day"),
  choose("Show today's walks in time order: 09:00 park, 12:30 lunch, 17:00 river", "Timeline"),
  write(
    "June 2026, a full month of dates, with watering planned on the 5th, 12th, 19th and 26th marked good. Open the 12th initially.",
  ),
  {
    ...write(
      "Show June 2026. Give only the 12th a warning-status dot. Leave the month heading at its default, with no emphasis override.",
    ),
    variant: { axis: "tone", value: "warn", item: 0 },
  },
  read("Open the 12th", { address: "c1/r12", action: "select" }),
] satisfies Probe[];

export function Calendar(input: Props<typeof props, typeof meta>) {
  const { month, marked, selected, start } = input;
  const emphasis = useVariant("emphasis", meta.variants.emphasis, input.emphasis);
  const { lang } = useWords();
  const blanks = (start - 1 + (marked[0]?.day ?? 1) - 1) % 7;
  const cells = [
    ...Array.from({ length: blanks }, () => null),
    ...marked.map((day) => (
      <KitDay
        key={day.id}
        item={day.id}
        label={numberLine(day.day, lang)}
        name={`${month} ${day.day}`}
        selected={selected === day.day}
        mark={day.mark}
      />
    )),
  ];
  return (
    <KitCard style="plain" part="root">
      <KitContent lineRole="heading" emphasis={emphasis}>
        <KitText role="heading" part="month" lines={1} emphasis={emphasis}>
          {month}
        </KitText>
        <KitWeekGrid cells={cells} />
      </KitContent>
    </KitCard>
  );
}

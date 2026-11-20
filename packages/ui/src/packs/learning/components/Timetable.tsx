import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { currentPeriod, readTimetable, timetableDays, weekdays, type Weekday } from "../copy";
import { learningWordsFor } from "../lang";

// Core first: Timeline/hours cannot group repeating classes by weekday and show room and teacher per period.
export const meta = {
  id: "Timetable",
  status: "ready",
  group: "data",
  purpose: "See the week's repeating classes and where to go for each period.",
  pick: "A student's repeating week of class periods with subject, room and teacher. Not a one-day schedule (Timeline), staff shifts (Roster), bookable slots (Slots) or family events (Agenda).",
  writeHints: [
    "Write each scheduled weekday once. For each period, write a 24-hour start time and subject, with room, teacher and semantic tone if supplied. Leave selected_day null; it is for the locally selected view. Never write the current period.",
    'Leave density, surface and detail null unless requested. For start times and subjects only, use detail "brief" and retain any rooms and teachers in the data.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The timetable is stored on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["room", "teacher"] } },
  parts: ["root", "day"],
  items: { key: "periods", parts: ["root", "time", "subject", "room", "teacher"] },
  states: ["filled", "empty"],
  selections: { day: { prop: "selected_day", choices: { prop: "scheduled_days" } } },
  actions: { parts: { day: ["select"] }, items: { root: ["press"] } },
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { periods, selected_day, detail } = input as TimetableProps;
    return readTimetable(periods, selected_day, detail, lang);
  },
} as const satisfies c.Meta;

const period = z.strictObject({
  time: c.clock,
  subject: c.text(24),
  room: c.text(12).optional(),
  teacher: c.text(24).optional(),
  tone: z.enum(["neutral", "good", "warn", "bad"]).default("neutral"),
});

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    selected_day: z.enum(weekdays).optional(),
    days: z
      .array(
        z.strictObject({
          day: z.enum(weekdays),
          periods: z.array(period).min(1).max(8),
        }),
      )
      .min(1)
      .max(7),
  })
  .refine(({ days }) => new Set(days.map(({ day }) => day)).size === days.length, { path: ["days"] })
  .overwrite((value) => ({
    ...value,
    selected_day: value.days.some(({ day }) => day === value.selected_day) ? value.selected_day : undefined,
    scheduled_days: value.days.map(({ day }) => day),
    periods: value.days.flatMap(({ day, periods }) => periods.map((period) => ({ day, ...period }))),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const subjects = c.itemsOf(cast, 4);
  return {
    days: [
      {
        day: "mon",
        periods: (subjects.length ? subjects : [undefined]).map((item, index) => ({
          time: "00:00",
          subject: (item && c.titleOf(item, 24, thing)) ?? c.placeholderTitle(index, lang),
          teacher: item && c.detailOf(item, 24, thing),
        })),
      },
    ],
  };
}

// prettier-ignore
export const examples = [
  {
    days: [
      {
        day: "mon",
        periods: [
          { time: "09:00", subject: "Fern care", room: "B12", teacher: "Ms Tanaka", tone: "good" },
          { time: "10:15", subject: "Potting basics", room: "Studio 2", teacher: "Ms Tanaka" },
          { time: "11:30", subject: "Plant nutrition", room: "B12" },
        ],
      },
      { day: "wed", periods: [
        { time: "10:30", subject: "Soil workshop", room: "Glasshouse" },
        { time: "12:00", subject: "Light and shade", teacher: "Mr Patel" },
      ] },
    ],
  },
  {
    selected_day: "tue",
    days: [
      { day: "tue", periods: [
        { time: "13:00", subject: "Lead skills", teacher: "Mr Woods", room: "Yard" },
        { time: "14:00", subject: "Group walks", room: "East field" },
      ] },
      { day: "thu", periods: [{ time: "14:15", subject: "Dog body language", room: "C04", teacher: "Ms Ellis" }] },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Timetable");
export const probes = [
  choose("Show my repeating school week, with each day's class periods, start times, rooms and teachers."),
  choose(
    "Show just today's events in chronological order with times, from morning to evening. It does not repeat.",
    "Timeline",
  ),
  write(
    "Japanese with Ms Tanaka in B12 at 09:00 every Monday, and Calligraphy in Studio 2 at 10:30 every Wednesday.",
  ),
  {
    ...write(
      "Every Monday at 09:00 I have Japanese with Ms Tanaka in B12. Keep the room and teacher in the plan, but show only when each class starts and what it's called.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Select Wednesday in the weekday picker, without opening any class.", {
    address: "t1/day",
    action: "select",
  }),
  read("Open the Monday class called Fern care.", { address: "t1/r1", action: "press" }),
] satisfies c.Probe[];

type Period = z.output<typeof period> & { day: Weekday; id: string };
type TimetableProps = c.Props<typeof props, typeof meta> & { periods: Period[] };

// prettier-ignore
function PeriodRow({ row, density, detail, active }: {
  row: Period; active: boolean; density: c.ThemeDensity; detail: TimetableProps["detail"];
}) {
  const { words, lang } = kit.useWords(learningWordsFor);
  const { id, subject, room, teacher, tone } = row;
  const full = detail === "full";
  const time = c.timeOfDayLine(row.time, lang);
  const label = words.timetable.reading([time, subject, full ? room : undefined, full ? teacher : undefined]);
  return <kit.KitRow item={id} part="root" role="button" label={label}
    {...{ density, tone }} selected={active} leading={<kit.KitTime value={time} />}
    trailing={active && <kit.KitIcon name="clock" tone="accent" decorative />}>
    <kit.KitText role="body" part="subject" density={density}>{subject}</kit.KitText>
    {full && room && <kit.KitText role="caption" tone="muted" part="room" density={density}>{room}</kit.KitText>}
    {full && teacher && <kit.KitText role="caption" tone="muted" part="teacher" density={density}>{teacher}</kit.KitText>}
  </kit.KitRow>;
}

// prettier-ignore
export function Timetable(input: TimetableProps) {
  const { periods, selected_day, detail } = input;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const state = kit.useComponentState();
  const { screen, component } = kit.usePartContext();
  const selected = kit.useControlValue(`${screen}/${component}/$selected_day`, selected_day);
  const { words } = kit.useWords(learningWordsFor);
  const at = new Date(), days = timetableDays(periods, selected, at), current = currentPeriod(periods, at);
  const options = weekdays.filter((day) => days.some((group) => group.day === day));
  const segmented = options.length > 1 && options.length <= 4;
  return <kit.KitCard part="root" padded={state !== "empty"} {...{ density, surface }}>
    {state === "empty" ? <kit.KitEmpty icon="calendar_days" part="title" decorativeIcon /> : <>
      <kit.KitTrack part="day" look={segmented ? "segments" : "pills"} role="radiogroup" label={words.timetable.picker}>
        {options.map((day) =>
          <kit.KitChip key={day} item={null} look={segmented ? "segment" : "pill"} role="radio" label={words.timetable.days[day].short} value={day} on={day === days[0]?.day} />
        )}
      </kit.KitTrack>
      {days.map(({ day, rows }) => <kit.KitContent key={day} group="response" density={density}>
        <kit.KitContent inset="md" density={density}>
          <kit.KitText role="body" tone="muted" part={null} density={density}>{words.timetable.days[day].name}</kit.KitText>
        </kit.KitContent>
        <kit.KitGrid arrange="rows" list listRowGap="group" density={density}>
          {rows.map((row) => <PeriodRow key={row.id} {...{ row, density, detail }} active={row === current} />)}
        </kit.KitGrid>
      </kit.KitContent>)}
    </>}
  </kit.KitCard>;
}

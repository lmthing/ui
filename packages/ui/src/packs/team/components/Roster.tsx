import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
// prettier-ignore
import { rosterCover, rosterDayHeading, rosterDateInWeek, rosterDays, rosterLocalDate, rosterPortrait, rosterReading, rosterShift, rosterToday, rosterWeek, shiftsByPerson, shiftsByStation, visibleRosterShifts } from "../copy";
import { teamWordsFor } from "../lang";

// prettier-ignore
const portraits = ["portrait_1", "portrait_2", "portrait_3", "portrait_4",
  "portrait_5", "portrait_6", "portrait_7", "portrait_8"] as const;

// Core first: Timeline/hours shows one schedule, not a week of shifts compared across people.
export const meta = {
  id: "Roster",
  status: "ready",
  group: "data",
  purpose: "See who works each day this week and spot gaps in cover.",
  pick: "Compare staff shift times across a week or see one day's staffing grouped by workstation. Not one person's schedule (Timeline), one shift (Shift), bookable hours (Availability), a sports lineup (Lineup), or class periods (Timetable).",
  writeHints: [
    "week is the Monday date. Use the person's zero-based index in people. Day indices: Mon 0, Tue 1, Wed 2, Thu 3, Fri 4, Sat 5, Sun 6. Omit shifts on days off, write roles only when provided, and do not write cover flags.",
    'Use style "day" when asked for staffing grouped by workstation. Set date only for an explicit date in that week; otherwise the day view uses today. Write the station on each shift when supplied, separately from the role.',
    'When asked to show times without role labels, write detail "brief" and keep the roles in the data. Use null for unrequested density, surface and detail.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  realPath: "A manager edits the rota in a shared app.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["role"] } },
  parts: ["root", "week", "matrix", "cover", "scroll_hint", "empty", ...portraits],
  items: { key: "shifts", parts: ["root", "role"] },
  live: {
    derive: (input): c.Values => {
      if (input.style !== "day") return {};
      const { week, date, shifts } = input as z.output<typeof props>;
      const rosterDate = date ?? rosterLocalDate(new Date());
      return { rosterDate, shifts: visibleRosterShifts(week, rosterDate, shifts) };
    },
  },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
  read: rosterReading,
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    style: z.enum(["week", "day"]).default("week"),
    week: c.isoDate.refine((date) => new Date(`${date}T00:00:00Z`).getUTCDay() === 1, "Use a Monday"),
    date: c.isoDate.optional().meta({ kind: undefined }),
    people: z
      .array(z.strictObject({ name: c.text(20), photo: c.photo }))
      .min(1)
      .max(8),
    shifts: z
      .array(
        z.strictObject({
          person: z.int().min(0).max(7),
          day: z.int().min(0).max(6),
          from: c.clock,
          to: c.clock,
          role: c.text(12).optional().meta({ kind: undefined }),
          station: c.text(20).optional().meta({ kind: undefined }),
        }),
      )
      .min(0)
      .max(40),
  })
  .refine(({ people, shifts }) => shifts.every(({ person }) => person < people.length), {
    path: ["shifts"],
    message: "Every shift must name an existing person index",
  })
  .refine(({ week, date }) => !date || rosterDateInWeek(week, date), {
    path: ["date"],
    message: "Use a date in the roster week",
  });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const names = c.itemsOf(cast, 8).flatMap((item) => c.titleOf(item, 20, thing) ?? []);
  return {
    week: "2026-11-16",
    people: (names.length ? names : [c.placeholderTitle(0, lang)]).map((name) => ({
      name,
      photo: "lib:people",
    })),
    shifts: [],
  };
}

export const examples = [
  {
    week: "2026-11-16",
    people: [
      { name: "Anna", photo: "lib:people" },
      { name: "Rae", photo: "lib:people" },
    ],
    shifts: [
      { person: 0, day: 0, from: "07:00", to: "12:00", role: "Watering" },
      { person: 1, day: 0, from: "12:00", to: "17:00", role: "Potting" },
      { person: 0, day: 2, from: "08:00", to: "14:00" },
    ],
  },
  {
    week: "2026-11-23",
    people: [
      { name: "Sam", photo: "lib:people" },
      { name: "Lee", photo: "lib:people" },
    ],
    shifts: [
      { person: 0, day: 1, from: "08:00", to: "13:00", role: "Park walks" },
      { person: 1, day: 5, from: "13:00", to: "18:00", role: "Home visits" },
      { person: 1, day: 0, from: "10:00", to: "15:00", role: "River walks" },
      { person: 1, day: 1, from: "10:00", to: "15:00", role: "Day care" },
    ],
  },
  {
    style: "day",
    week: "2026-11-16",
    date: "2026-11-16",
    people: [
      { name: "Anna", photo: "lib:people" },
      { name: "Rae", photo: "lib:people" },
    ],
    shifts: [
      { person: 0, day: 0, from: "07:00", to: "12:00", role: "Watering", station: "Greenhouse" },
      { person: 1, day: 0, from: "08:00", to: "13:00", station: "Potting bench" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Roster");
export const probes = [
  choose(
    "Show a Monday-to-Sunday staff rota with one row per person and their assigned hours in each day cell.",
  ),
  choose(
    "Show the timed events in my own day in order, from the morning visit to the evening walk.",
    "Timeline",
  ),
  write(
    "Start the rota Monday 2026-11-16. Put Sam first and Lee second, both with lib:people photos. Sam works Monday 07:00–12:00 and Lee works Saturday 12:00–17:00.",
  ),
  {
    ...write(
      "Show the staff rota for the week starting Monday 2026-11-16. Sam, photo lib:people, works Monday from 07:00 to 12:00 on watering. Keep the role on record but show only the shift times, without role labels.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open Anna's Wednesday shift at 08:00", { address: "r1/r3", action: "press" }),
  {
    ...write(
      "Show just Monday 2026-11-16 grouped by workstation, not the weekly grid. Sam (photo lib:people) works 07:00–12:00 at the Greenhouse station.",
    ),
    expectProps: { style: "day", date: "2026-11-16", shifts: [{ station: "Greenhouse" }] },
  },
] satisfies c.Probe[];

type ViewProps = c.Props<typeof props, typeof meta>;
type MatrixProps = ViewProps & { loading: boolean };

function RosterDay({ people, shifts, density, detail }: MatrixProps) {
  const {
    words: { roster: w },
    lang,
  } = kit.useWords(teamWordsFor);
  return (
    <kit.KitRowGroup spacing="groups" separators={false} density={density}>
      {shiftsByStation(shifts).map(({ station, shifts: rows }) => (
        <kit.KitContent key={station ?? ""} density={density}>
          <kit.KitHeader
            title={{ text: station ?? w.unassigned, role: "body", strong: true }}
            density={density}
          />
          <kit.KitRowGroup density={density}>
            {rows.map((shift) => {
              const name = people[shift.person]!.name;
              const { time, role } = rosterShift(shift, detail === "brief", lang);
              const label = w.personReading(name, [w.shift(time, role)]);
              return (
                <kit.KitRow
                  key={shift.id}
                  item={shift.id}
                  part="root"
                  role="button"
                  label={label}
                  inset="none"
                  density={density}
                >
                  <kit.KitMetaLine
                    title={{ text: name, role: "body", strong: true }}
                    meta={[
                      { text: time, tabular: true },
                      { text: role, part: "role" },
                    ]}
                    density={density}
                  />
                </kit.KitRow>
              );
            })}
          </kit.KitRowGroup>
        </kit.KitContent>
      ))}
    </kit.KitRowGroup>
  );
}

// prettier-ignore
function RosterMatrix({ week, people, shifts, density, detail, loading }: MatrixProps) {
  const { words, lang } = kit.useWords(teamWordsFor);
  const w = words.roster;
  const days = rosterDays(shifts, lang).map((day) => ({
    ...day,
    header: <kit.KitText role="label" tone={day.uncovered ? "warn" : "text"} part={null}>{day.short}</kit.KitText>,
  }));
  const schedule = shiftsByPerson(people, shifts);
  const rows = people.map(({ name, photo }, person) => ({
    id: `person_${person}`,
    label: name,
    heading: (
      <kit.KitRow inline density={density} label={name} leadingAlign="row"
        leading={<kit.KitPhoto {...rosterPortrait(name, photo)} shape="round" label={name} part={portraits[person]!} />}>
        <kit.KitRow inline label={name}>
          <kit.KitText role="label" lines={1} part={null}>{name}</kit.KitText>
        </kit.KitRow>
      </kit.KitRow>
    ),
    cells: days.map((day, index) => ({
      id: day.id,
      content: schedule[person]!.filter(({ shift }) => shift.day === index).map(({ shift }) => {
        const { time, role } = rosterShift(shift, detail === "brief", lang);
        return (
          <kit.KitRow key={shift.id} item={shift.id} part="root" role="button" inline
            density={density} label={w.shiftLabel(name, day.label, w.shift(time, role))}>
            <kit.KitText role="number" numberScale="compact" tabular lines={1} part={null}>{time}</kit.KitText>
            {role && <kit.KitText role="caption" tone="muted" lines={1} part="role">{role}</kit.KitText>}
          </kit.KitRow>
        );
      }),
    })),
  }));
  const cover = rosterCover(days, lang);
  return <>
    <kit.KitWeekMatrix part="matrix" {...{ days, rows, loading }}
      today={rosterToday(week, new Date())}
      corner={<kit.KitText part={null} role="label" tone="muted">{w.staff}</kit.KitText>} />
    {loading ? <kit.KitSkeleton density={density} shape="figure" inset="none"
      content={[["caption", cover], ["caption", w.scrollHint]]} /> : <kit.KitContent density={density}>
      {cover && <kit.KitText role="caption" part="cover" tone="warn">{cover}</kit.KitText>}
      <kit.KitText part="scroll_hint" role="caption" tone="muted">{w.scrollHint}</kit.KitText>
    </kit.KitContent>}
  </>;
}

// prettier-ignore
export function Roster(input: ViewProps) {
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { words, lang } = kit.useWords(teamWordsFor);
  const live = kit.useLiveControls(meta, input) as ViewProps & { rosterDate?: string };
  const day = live.rosterDate;
  const heading = day ? rosterDayHeading(day, lang) : rosterWeek(input.week, lang);
  const loading = state === "loading";
  const body = day ? <RosterDay {...live} {...{ detail, density, loading }} /> :
    <RosterMatrix {...input} {...{ detail, density, loading }} />;
  const empty = <kit.KitEmpty part="empty" icon="calendar_days" decorativeIcon
    title={words.roster.empty} prominence="body" />;
  const loaded = !live.shifts.length ? empty : body;
  return (
    <kit.KitCard padded {...{ density, surface }}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["heading", heading]]} /> :
        <kit.KitText part="week" role="heading">{heading}</kit.KitText>}
      {loading && !day ? body : (
        <kit.KitState part="empty" icon="calendar_days" message={words.roster.empty} density={density}
          loading={<kit.KitSkeleton density={density} />}>
          {loaded}
        </kit.KitState>
      )}
    </kit.KitCard>
  );
}

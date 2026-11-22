import { z } from "zod";
import {
  itemVariantProps,
  appointmentDate,
  dateSpanChoice,
  isoDate,
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
import {
  useLiveControls,
  useVariant,
  useWords,
  KitCard,
  KitContent,
  KitDay,
  KitGrid,
  KitText,
  KitWeekGrid,
} from "../kit";
import { prompt } from "../entry/prompt-Calendar.generated";

function monthGeometry(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number) as [number, number];
  return {
    start: ((new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7) + 1,
    days: new Date(Date.UTC(year, month, 0)).getUTCDate(),
  };
}

export const meta = {
  id: "Calendar",
  status: "ready",
  signature: "calendar_sweep",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  tier: "phone",
  realPath: "Dates with activity queried from the on-device database, with a locally selected day.",
  variants: { emphasis: ["normal", "quiet"] },
  items: { key: "marked", parts: ["root", "label"], variants: { tone: ["neutral", "good", "warn", "bad"] } },
  select: { prop: "selected", value: { field: "day" } },
  dateSpan: {
    start: "checkIn",
    end: "checkOut",
    date: "date",
    available: "available",
    when: { prop: "range", equals: true },
  },
  parts: ["root", "month", "range_status"],
  states: ["filled"],
  actions: { items: { root: ["select"] } },
  read: (value, _state, lang?: string): string[] => {
    const { marked, range, checkIn, checkOut } = value as Omit<z.output<typeof props>, "marked"> & {
      marked: (z.output<typeof props>["marked"][number] & { id: string })[];
    };
    const words = wordsFor(lang).calendarRange;
    return [
      ...(range ? spanLines(words, checkIn, checkOut, lang) : []),
      ...marked.map((day) => `${day.id}: ${numberLine(day.day, lang)}${day.mark ? ` (${day.mark})` : ""}`),
    ];
  },
} as const satisfies Meta;

// prettier-ignore
export const props = z.strictObject({
  ...variantProps(meta.variants),
  style: z.enum(["week", "month"]).default("week"), month: text(16),
  marked: z.array(z.strictObject({ day: z.int().min(1).max(31), ...itemVariantProps(meta.items.variants) })
    .transform((day): typeof day & { mark?: typeof day.tone | undefined; date?: string; available?: boolean } =>
      ({ ...day, mark: day.tone }))).min(0).max(12),
  selected: z.int().min(1).max(31).optional(), start: z.int().min(1).max(7).default(1),
  days: z.int().min(28).max(31).default(30), range: z.boolean().optional(),
  yearMonth: text(7).refine((month) => isoDate.safeParse(`${month}-01`).success).meta({ kind: "text", max: 7, read: false }).optional(),
  checkIn: isoDate.optional(), checkOut: isoDate.optional(),
  unavailable: z.array(z.int().min(1).max(31)).min(0).max(31).optional(),
})
  .refine(({ marked, selected, days, range, yearMonth }) => {
    const count = range && yearMonth ? monthGeometry(yearMonth).days : days;
    return marked.every((mark) => mark.day <= count) && (selected ?? 1) <= count;
  }, { message: "Dates must exist in this month" })
  .refine(({ marked }) => new Set(marked.map((mark) => mark.day)).size === marked.length,
    { path: ["marked"], message: "Mark each date only once" })
  .refine(validRange, { message: "Range needs an ISO month and an available ordered span within that month" })
  .overwrite((wire) => {
    const yearMonth = wire.range ? wire.yearMonth : undefined;
    const value = yearMonth ? { ...wire, ...monthGeometry(yearMonth), style: "month" as const } : wire;
    const anchor = value.selected ?? value.marked[0]?.day ?? 1;
    const week = Math.floor((value.start + anchor - 2) / 7);
    const first = value.style === "month" ? 1 : Math.max(1, week * 7 - value.start + 2);
    const last = value.style === "month" ? value.days : Math.min(value.days, (week + 1) * 7 - value.start + 1);
    return { ...value, marked: Array.from({ length: last - first + 1 }, (_, index) => {
      const day = first + index;
      const source = value.marked.find((mark) => mark.day === day);
      return { day, tone: source?.tone ?? "neutral", mark: source?.mark, ...(yearMonth && {
        date: `${yearMonth}-${String(day).padStart(2, "0")}`, available: !value.unavailable?.includes(day),
      }) };
    }) };
  });

// prettier-ignore
function validRange({ range, yearMonth, checkIn, checkOut, selected, unavailable }: {
  range?: boolean | undefined; yearMonth?: string | undefined; checkIn?: string | undefined;
  checkOut?: string | undefined; selected?: number | undefined; unavailable?: number[] | undefined;
}) {
  if (!range)
    return (
      yearMonth === undefined && checkIn === undefined && checkOut === undefined && unavailable === undefined
    );
  if (!yearMonth || selected !== undefined) return false;
  if (unavailable?.some((day) => day > monthGeometry(yearMonth).days)) return false;
  const dayOf = (date: string) => Number(date.slice(-2));
  const blocked = new Set(unavailable);
  if (!checkIn) return checkOut === undefined;
  if (!checkIn.startsWith(`${yearMonth}-`) || blocked.has(dayOf(checkIn))) return false;
  if (!checkOut) return true;
  return (
    checkOut.startsWith(`${yearMonth}-`) &&
    checkIn < checkOut &&
    ![...blocked].some((day) => day >= dayOf(checkIn) && day <= dayOf(checkOut))
  );
}

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
  { style: "week", month: "June 2026", marked: [{ day: 12 }], selected: 10 },
  { month: "June 2026", marked: [{ day: 12 }], selected: 10, emphasis: "quiet" },
  { month: "June 2026", marked: [{ day: 12, tone: "good" }], selected: 10 },
  { month: "June 2026", marked: [{ day: 12, tone: "warn" }], selected: 10 },
  { month: "June 2026", marked: [{ day: 12, tone: "bad" }], selected: 10 },
  {
    month: "July 2026",
    style: "month",
    marked: [],
    range: true,
    yearMonth: "2026-07",
    checkIn: "2026-07-06",
    checkOut: "2026-07-10",
    unavailable: [3, 17],
  },
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
  {
    ...write(
      "Show July 2026 with a two-date check-in and check-out picker; start with July 6 through July 10 selected.",
    ),
    expectProps: { range: true, yearMonth: "2026-07", checkIn: "2026-07-06", checkOut: "2026-07-10" },
  },
] satisfies Probe[];

function spanLines(
  words: ReturnType<typeof wordsFor>["calendarRange"],
  start?: string,
  end?: string,
  lang?: string,
) {
  if (!start) return [words.chooseStart];
  const arrival = words.endpoint(words.start, appointmentDate(start, lang));
  return [arrival, end ? words.endpoint(words.end, appointmentDate(end, lang)) : words.chooseEnd];
}

type CalendarProps = Props<typeof props, typeof meta>;

function CalendarCells(
  live: CalendarProps,
  copy: ReturnType<typeof wordsFor>["calendarRange"],
  lang?: string,
) {
  const { month, marked, selected, start, range, checkIn, checkOut } = live;
  const blanks = (start + (marked[0]?.day ?? 1) - 2) % 7;
  return [
    ...Array.from({ length: blanks }, () => null),
    ...marked.map((day) => {
      const label = numberLine(day.day, lang);
      const name = copy.day(month, label);
      const { date } = day;
      const inSpan = Boolean(date && checkIn && checkOut && date >= checkIn && date <= checkOut);
      const endpoint = date !== undefined && (date === checkIn || date === checkOut);
      const status =
        date &&
        (date === checkIn
          ? copy.start
          : date === checkOut
            ? copy.end
            : inSpan
              ? copy.inside
              : day.available === false
                ? copy.unavailable
                : undefined);
      return (
        <KitDay
          key={day.id}
          item={day.id}
          label={label}
          name={status ? copy.label(name, status) : name}
          selected={range ? endpoint : selected === day.day}
          mark={day.mark}
          {...(range && { inSpan, disabled: !dateSpanChoice(meta, live, date) })}
        />
      );
    }),
  ];
}

export function Calendar(input: CalendarProps) {
  const live = useLiveControls(meta, input) as CalendarProps;
  const { month, range, checkIn, checkOut } = live;
  const emphasis = useVariant("emphasis", meta.variants.emphasis, input.emphasis);
  const {
    lang,
    words: { calendarRange: copy },
  } = useWords();
  const [arrival, departure] = range ? spanLines(copy, checkIn, checkOut, lang) : [];
  const cells = CalendarCells(live, copy, lang);
  return (
    <KitCard style={range ? "inset" : "plain"} padded={range === true} part="root">
      <KitContent lineRole="heading" emphasis={emphasis}>
        <KitText
          role="heading"
          part="month"
          lines={1}
          emphasis={emphasis}
          tone={emphasis === "quiet" ? "muted" : "text"}
        >
          {month}
        </KitText>
        {arrival && (
          <KitGrid columns={2}>
            <KitText role="caption" part="range_status">
              {arrival}
            </KitText>
            {departure && (
              <KitText role="caption" part={null}>
                {departure}
              </KitText>
            )}
          </KitGrid>
        )}
        <KitWeekGrid cells={cells} />
      </KitContent>
    </KitCard>
  );
}

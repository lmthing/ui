import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { hoursCopy, hoursReading } from "../copy";
import { placesWordsFor } from "../lang";

// Core first: Timeline/hours shows one day's events, not a recurring opening week with special dates.
export const meta = {
  id: "Hours",
  status: "ready",
  group: "data",
  purpose: "Check when a place is open today and through the week.",
  pick: "A venue's recurring opening hours across all seven weekdays, with optional special dates. Not a day's events (Timeline), bookable times (Availability), or staff shifts (Roster).",
  writeHints: [
    "Write each weekday exactly once in Monday–Sunday order. For a closed day use 00:00 for both times; opening and closing times must differ on open days. Do not write the computed open state. Use [] when there are no special dates.",
    'Display supplied special dates by writing detail null. Only if explicitly asked to hide the notices, set detail "brief" and keep the dates in special. Write density null unless explicitly asked for compact or comfortable spacing.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Opening hours are stored with the place.",
  dense: true,
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["special"] } },
  items: { key: "days", parts: ["root", "day", "from", "to", "closed"] },
  parts: ["root", "open_state", "special"],
  states: ["filled"],
  read: (input, _state, lang): string[] => hoursReading(input as z.output<typeof props>, new Date(), lang),
} as const satisfies c.Meta;

const weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const midnight = "00:00";
const dayProps = z.strictObject({
  day: z.enum(weekdays),
  from: c.clock,
  to: c.clock,
  closed: z.boolean(),
});
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    days: z.array(dayProps).min(7).max(7),
    special: z
      .array(z.strictObject({ date: c.isoDate, text: c.text(24) }))
      .min(0)
      .max(3),
  })
  .refine(({ days }) => new Set(days.map(({ day }) => day)).size === 7, {
    path: ["days"],
    message: "Give every weekday exactly once",
  })
  .refine(({ days }) => days.every(({ from, to, closed }) => closed || from !== to), {
    path: ["days"],
    message: "Use different opening and closing times on open days",
  })
  .overwrite((value) => ({
    ...value,
    days: [...value.days]
      .sort((a, b) => weekdays.indexOf(a.day) - weekdays.indexOf(b.day))
      .map((day) => (day.closed ? { ...day, from: midnight, to: midnight } : day)),
  }));

export function fallback(_input: c.FallbackInput): z.input<typeof props> {
  return { days: weekdays.map((day) => ({ day, from: midnight, to: midnight, closed: true })), special: [] };
}

export const examples = [
  {
    days: weekdays.map((day) => ({
      day,
      from: day === "sun" ? "10:00" : "09:00",
      to: day === "fri" ? "20:00" : day === "sun" ? "16:00" : "18:00",
      closed: false,
    })),
    special: [{ date: "2026-12-24", text: "Closes at 14:00" }],
  },
  {
    days: weekdays.map((day) =>
      day === "mon"
        ? { day, from: "00:00", to: "00:00", closed: true }
        : { day, from: "08:00", to: "16:00", closed: false },
    ),
    special: [
      { date: "2026-12-25", text: "Closed for Christmas" },
      { date: "2026-12-26", text: "No dog field access" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write } = c.probesFor("Hours");
export const probes = [
  choose("Show the nursery's opening and closing hours for every weekday and flag holiday changes"),
  choose("Show today's events in order: opening talk at 09:00, tour at 10:00 and demo at noon", "Timeline"),
  write(
    "The garden centre is open 09:00 to 18:00 Monday through Saturday, closed Sundays, and closes at 14:00 on 2026-12-24.",
  ),
  {
    ...write(
      "The dog exercise field is open 08:00 to 16:00 every day. Keep the December 25 closure (2026-12-25) in the data, but show just the regular week without the special dates.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
] satisfies c.Probe[];

type HoursProps = c.Props<typeof props, typeof meta>;
type HoursCopy = ReturnType<typeof hoursCopy>;

// prettier-ignore
function WeekRows({ days, copy, density }: { days: HoursProps["days"]; copy: HoursCopy; density: c.ThemeDensity }) {
  const { words } = kit.useWords(placesWordsFor);
  return (
    <kit.KitGrid list arrange="rows" density={density} listRowGap={density === "comfortable" ? "group" : undefined}>
      {days.map(({ id }, index) => {
        const { day, from, to, closed } = copy.days[index]!;
        const selected = index === copy.today;
        const label = selected ? copy.todayLabel : day;
        return (
          <kit.KitRow key={id} item={id} label={label} density={density} trailing={
            closed ? <kit.KitText part="closed" tone="muted" density="comfortable">{words.closed}</kit.KitText> : <>
              <kit.KitText part="from" role="number" numberScale="compact" tone={selected ? "text" : "muted"} tabular density="comfortable">{from}</kit.KitText>
              <kit.KitText part={null} tone="muted" density="comfortable">{words.hoursDash}</kit.KitText>
              <kit.KitText part="to" role="number" numberScale="compact" tone={selected ? "text" : "muted"} tabular density="comfortable">{to}</kit.KitText>
            </>
          }>
            <kit.KitText part="day" role={selected ? "label" : "body"} emphasis={selected ? "hero" : "normal"} tone={selected ? "accent" : "text"} density="comfortable">{label}</kit.KitText>
          </kit.KitRow>
        );
      })}
    </kit.KitGrid>
  );
}

// prettier-ignore
export function Hours(input: HoursProps) {
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { lang, words } = kit.useWords(placesWordsFor);
  const copy = hoursCopy({ ...input, detail }, new Date(), lang);
  return (
    <kit.KitCard part="root" density={density}>
      <kit.KitRow label={copy.headline} part={null} lineRole="heading" emphasis="hero" density={density}>
        <kit.KitText part="open_state" role="heading" emphasis="hero" tone={copy.open ? "good" : "text"} density={density}>{copy.headline}</kit.KitText>
        {copy.currentNotices.map(({ text }, index) =>
          <kit.KitText key={index} part={null} tone="muted" density={density}>{text}</kit.KitText>
        )}
      </kit.KitRow>
      <WeekRows days={input.days} {...{ copy, density }} />
      {copy.notices.length > 0 && (
        <kit.KitContent group="response" density={density}>
          <kit.KitRow part="special" label={words.hoursSpecial} density={density}>
            <kit.KitContent group="response" density={density}>
              <kit.KitText part={null} role="label" density={density}>{words.hoursSpecial}</kit.KitText>
              {copy.notices.map(({ date, dateLabel, text }, index) => (
                <kit.KitContent key={`${date}/${index}`} density={density} group={index > 0 ? "response" : "content"}>
                  <kit.KitText part={null} role="label" density={density}>{dateLabel}</kit.KitText>
                  <kit.KitText part={null} role="body" tone="muted" density={density}>{text}</kit.KitText>
                </kit.KitContent>
              ))}
            </kit.KitContent>
          </kit.KitRow>
        </kit.KitContent>
      )}
    </kit.KitCard>
  );
}

// prettier-ignore
import { KitCard, KitContent, KitGrid, KitInput, KitLayoutText, KitRow, KitRowGroup, KitText, KitTrail,
  useControlValue, usePart, useKit, useWords } from "../../../kit";
// prettier-ignore
import { clock, isoDate, probesFor, type CastLike, type Meta, type Probe, type Props, variantProps } from "../../../catalog";
import { z } from "zod";
import { bookingWordsFor } from "../lang";
import {
  availabilityDayLabel,
  availabilityDefaults,
  availabilityReading,
  bookingWeekdays,
  breakLine,
  bufferLine,
  dateOverrideLine,
} from "../copy";
import { prompt } from "../../../entry/prompt-Availability.generated";
// Core first: Field/time edits one time, not a seven-day working week with switches and breaks.
export const meta = {
  id: "Availability",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Working hours stored on the device.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["break"] } },
  items: { key: "days", parts: ["root", "day", "toggle", "from", "to", "break"] },
  parts: ["root", "buffer", "overrides"],
  states: ["filled"],
  actions: { items: { toggle: ["toggle"], from: ["type"], to: ["type"] } },
  read: (input, state, lang): string[] =>
    state === "filled" ? availabilityReading(input as z.output<typeof props>, lang) : [],
} as const satisfies Meta;
const weekdays = bookingWeekdays;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    bufferMinutes: z.literal([0, 5, 10, 15, 30]).optional(),
    dateOverrides: z
      .array(z.strictObject({ date: isoDate, kind: z.enum(["blocked", "holiday"]) }))
      .min(0)
      .max(6)
      .refine((dates) => new Set(dates.map(({ date }) => date)).size === dates.length)
      .optional(),
    days: z
      .array(
        z.strictObject({
          day: z.enum(weekdays).meta({ kind: "text" }),
          on: z.boolean(),
          from: clock,
          to: clock,
          breakFrom: clock.optional(),
          breakTo: clock.optional(),
        }),
      )
      .min(7)
      .max(7),
  })
  .refine(
    ({ days }) =>
      new Set(days.map((day) => day.day)).size === 7 &&
      days.every(
        (day) =>
          (!day.on || day.from < day.to) &&
          ((day.breakFrom === undefined && day.breakTo === undefined) ||
            !!(
              day.breakFrom &&
              day.breakTo &&
              day.from <= day.breakFrom &&
              day.breakFrom < day.breakTo &&
              day.breakTo <= day.to
            )),
      ),
    { path: ["days"] },
  )
  .overwrite((value) =>
    value.detail === "brief"
      ? { ...value, days: value.days.map((day) => ({ ...day, breakFrom: undefined, breakTo: undefined })) }
      : value,
  );
export function fallback(_input: { cast: CastLike }): z.input<typeof props> {
  return { days: weekdays.map((day) => ({ day, on: false, ...availabilityDefaults })) };
}
// Ledge's plant-care visits, with a midday break.
const plantCareWeek = {
  days: weekdays.map((day) => ({
    day,
    on: !["sat", "sun"].includes(day),
    from: "09:00",
    to: "17:00",
    ...(!["sat", "sun"].includes(day) ? { breakFrom: "12:00", breakTo: "13:00" } : {}),
  })),
};
// prettier-ignore
export const examples = [
  plantCareWeek,
  // Trot's walking week.
  {
    days: weekdays.map((day) => ({
      day, on: ["mon", "wed", "fri"].includes(day), from: "08:00", to: "16:00",
      ...(day === "mon" ? { breakFrom: "12:00", breakTo: "13:00" } : {}),
    })),
  },
  { ...plantCareWeek },
  { ...plantCareWeek, detail: "brief" },
  { ...plantCareWeek, bufferMinutes: 15, dateOverrides: [
    { date: "2026-12-24", kind: "blocked" }, { date: "2026-12-25", kind: "holiday" },
  ] },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Availability");
// prettier-ignore
export const probes = [
  choose("Set which weekdays I take bookings, the start and finish each day, and my lunch break"),
  choose("Enter a single start time in a form", "Field"),
  write("Take bookings Monday to Friday 09:00 to 17:00, weekends off, no breaks"),
  {
    ...write(
      "Set Monday to Friday from 09:00 to 17:00 with lunch from noon to 13:00, weekends off. Keep the lunch breaks in the schedule but show only the opening and closing times on the screen.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Turn off bookings on Monday", { address: "a1/r1/toggle", action: "toggle" }),
  read("Change Monday's booking start to 10:00", { address: "a1/r1/from", action: "type" }),
  read("Change Monday's booking finish to 16:00", { address: "a1/r1/to", action: "type" }),
  { ...write("Take bookings weekdays 09:00 to 17:00, weekends off. Allow a 15-minute gap between consecutive bookings."),
    expectProps: { bufferMinutes: 15 } },
  { ...write("Take bookings weekdays 09:00 to 17:00, weekends off. Block 2026-12-24 and mark 2026-12-25 as a holiday. List those exceptions in chronological order."),
    expectProps: { dateOverrides: [{ date: "2026-12-24", kind: "blocked" }, { date: "2026-12-25", kind: "holiday" }] } },
] satisfies Probe[];
// prettier-ignore
function DayFields({ day }: { day: Props<typeof props, typeof meta>["days"][number] }) {
  const { lang, words: { availabilityLabels } } = useWords(bookingWordsFor);
  const toggle = usePart("toggle", false);
  const on = useControlValue(toggle.testID, day.on);
  return (
    <>
      <KitRow inline label={availabilityDayLabel(day.day, true, lang)}
        trailing={<KitTrail kind="toggle" on={day.on} part="toggle" />}>
        <KitLayoutText line={{ text: availabilityDayLabel(day.day, on, lang),
          part: "day", strong: on, tone: on ? "text" : "muted" }} />
      </KitRow>
      <KitGrid columns={2}>
        <KitRow inline label={availabilityLabels.from}>
          <KitText role="caption" tone="muted" part={null}>{availabilityLabels.from}</KitText>
          <KitInput compact inactive={!on} kind="time" part="from" hint={availabilityLabels.from} value={day.from} />
        </KitRow>
        <KitRow inline label={availabilityLabels.to}>
          <KitText role="caption" tone="muted" part={null}>{availabilityLabels.to}</KitText>
          <KitInput compact inactive={!on} kind="time" part="to" hint={availabilityLabels.to} value={day.to} />
        </KitRow>
      </KitGrid>
      {day.breakFrom && day.breakTo && (
        <KitContent group="response">
          <KitLayoutText line={{ text: breakLine(day.breakFrom, day.breakTo, lang),
            part: "break", role: "caption", tone: "muted", tabular: true }} />
        </KitContent>
      )}
    </>
  );
}

// prettier-ignore
export function Availability(input: Props<typeof props, typeof meta>) {
  const { days, bufferMinutes, dateOverrides } = input;
  const density = useKit().density;
  const { lang, words } = useWords(bookingWordsFor);
  return (
    <KitCard style="inset" part="root">
      <KitRowGroup density={density}>
        {days.map((day) => (
          <KitRow key={day.id} item={day.id} label={day.day} density={density}>
            <DayFields day={day} />
          </KitRow>
        ))}
      </KitRowGroup>
      {bufferMinutes !== undefined && <KitRow part={null} label={bufferLine(bufferMinutes, lang)} density={density}>
        <KitText part="buffer" role="label">{bufferLine(bufferMinutes, lang)}</KitText>
      </KitRow>}
      {!!dateOverrides?.length && <KitRow part={null} label={words.availabilityOverrides} density={density}>
        <KitContent density={density}>
          <KitText part="overrides" role="label">{words.availabilityOverrides}</KitText>
          {dateOverrides.map(({ date, kind }) => <KitText key={date} part={null} role="caption" tone="muted">
            {dateOverrideLine(date, kind, lang)}
          </KitText>)}
        </KitContent>
      </KitRow>}
    </KitCard>
  );
}

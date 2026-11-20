// prettier-ignore
import { KitCard, KitGrid, KitInput, KitRow, KitText, KitTrail,
  useControlValue, usePart, useVariant, useWords } from "../../../kit";
// prettier-ignore
import { wordsFor, clock, probesFor, variantProps, type CastLike, type Meta, type Probe, type Props } from "../../../catalog";
import { bookingWordsFor } from "../lang";
import { z } from "zod";
import { availabilityDefaults, breakLine } from "../copy";

// Core first: Field/time edits one time, not a seven-day working week with switches and breaks.
export const meta = {
  id: "Availability",
  status: "ready",
  group: "input",
  purpose: "Set the working week during which people can book.",
  pick: "Seven weekdays with working switches, start and end times and breaks. Not one time field (Field), one day's free starts (Slots), staff shifts (Roster), or venue opening hours (Hours).",
  writeHints: [
    "Write each weekday once, mon through sun. End follows start; breaks need both endpoints inside working hours.",
    'Leave density and detail null unless requested. For working times without visible breaks, use detail "brief" and keep the breaks in the data.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Working hours stored on the device.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["break"] } },
  items: { key: "days", parts: ["root", "day", "toggle", "from", "to", "break"] },
  parts: ["root"],
  states: ["filled"],
  actions: { items: { toggle: ["toggle"], from: ["type"], to: ["type"] } },
  read: (input, state, lang?: string): string[] => {
    const { weekdayNames } = wordsFor(lang);
    const { availabilityLabels } = bookingWordsFor(lang);
    return state !== "filled"
      ? []
      : [
          ...weekdayNames,
          availabilityLabels.from,
          availabilityLabels.to,
          ...(input as z.output<typeof props>).days.flatMap((day) => [
            day.from,
            day.to,
            ...(day.breakFrom && day.breakTo ? [breakLine(day.breakFrom, day.breakTo, lang)] : []),
          ]),
        ];
  },
} as const satisfies Meta;
const weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
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
export const examples = [
  // Ledge's plant-care visits, with a midday break.
  {
    days: weekdays.map((day) => ({
      day,
      on: !["sat", "sun"].includes(day),
      from: "09:00",
      to: "17:00",
      ...(!["sat", "sun"].includes(day) ? { breakFrom: "12:00", breakTo: "13:00" } : {}),
    })),
  },
  // Trot's walking week.
  {
    detail: "brief",
    density: "compact",
    days: weekdays.map((day) => ({
      day,
      on: ["mon", "wed", "fri"].includes(day),
      from: "08:00",
      to: "16:00",
      ...(day === "mon" ? { breakFrom: "12:00", breakTo: "13:00" } : {}),
    })),
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Availability");
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
] satisfies Probe[];

function DayFields({ day }: { day: Props<typeof props, typeof meta>["days"][number] }) {
  const {
    lang,
    words: { weekdayNames },
  } = useWords();
  const { availabilityLabels } = bookingWordsFor(lang);
  const toggle = usePart("toggle", false);
  const on = useControlValue(toggle.testID, day.on);
  return (
    <>
      <KitRow
        inline
        label={weekdayNames[weekdays.indexOf(day.day)]!}
        trailing={<KitTrail kind="toggle" on={day.on} part="toggle" />}
      >
        <KitText role="label" part="day">
          {weekdayNames[weekdays.indexOf(day.day)]}
        </KitText>
      </KitRow>
      <KitGrid columns={2}>
        <KitRow inline label={availabilityLabels.from}>
          <KitText role="caption" tone="muted" part={null}>
            {availabilityLabels.from}
          </KitText>
          <KitInput
            compact
            inactive={!on}
            kind="time"
            part="from"
            hint={availabilityLabels.from}
            value={day.from}
          />
        </KitRow>
        <KitRow inline label={availabilityLabels.to}>
          <KitText role="caption" tone="muted" part={null}>
            {availabilityLabels.to}
          </KitText>
          <KitInput
            compact
            inactive={!on}
            kind="time"
            part="to"
            hint={availabilityLabels.to}
            value={day.to}
          />
        </KitRow>
      </KitGrid>
      {day.breakFrom && day.breakTo && (
        <KitText role="caption" tone="muted" part="break">
          {breakLine(day.breakFrom, day.breakTo, lang)}
        </KitText>
      )}
    </>
  );
}

export function Availability({ days, density: requestedDensity }: Props<typeof props, typeof meta>) {
  const density = useVariant("density", meta.variants.density, requestedDensity);
  return (
    <KitCard style="inset" part="root">
      {days.map((day) => (
        <KitRow key={day.id} item={day.id} label={day.day} density={density}>
          <DayFields day={day} />
        </KitRow>
      ))}
    </KitCard>
  );
}

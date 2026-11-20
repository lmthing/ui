// prettier-ignore
import { KitAction, KitCard, KitContent, KitGrid, KitSkeleton, KitText, KitTrail,
  useComponentState, useVariant, useWords } from "../../../kit";
import { bookingWordsFor } from "../lang";
import { z } from "zod";
// prettier-ignore
import {
  appointmentDate, balancedLine, clock, isoDate, placeholderTitle, probesFor, screenId, text,
  timeOfDayLine, thingOf, titleOf, variantProps, type ThemeDensity, type FallbackInput, type Meta,
  type Probe, type Props,
} from "../../../catalog";
import { appointmentDetails, appointmentReading } from "../copy";
// Core first: Card/plain previews a record, not structured booking terms and reschedule/cancel.
export const meta = {
  id: "Appointment",
  status: "ready",
  group: "content",
  purpose: "See, change or confirm one booking with its time and terms.",
  pick: "One booking with structured date, time, duration and change or cancellation actions. Not a simple record preview (Card), the day's bookings in order (Timeline), free start times (Slots), or goods ordered (OrderSummary).",
  writeHints: [
    'policy is only allowed with style: "summary". For style: "card", omit policy.',
    'Hiding who and where changes ONLY detail to "brief"; retain with and place in the data. Always set density to null unless a spacing change is requested; do not spell out "comfortable".',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A booking record stored on the provider's device.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["with", "place"] } },
  // prettier-ignore
  parts: [
    "root", "service", "with", "date", "time", "minutes", "place", "price", "status",
    "policy", "reschedule", "cancel", "edit",
  ],
  confirmParts: ["cancel"],
  states: ["filled", "loading", "success"],
  actions: {
    parts: { root: ["press"], reschedule: ["press"], cancel: ["press"], edit: ["press"] },
    when: { reschedule: { style: "card" }, cancel: { style: "card" }, edit: { style: "summary" } },
  },
  read: (input, _state, lang?: string): string[] => appointmentReading(input as z.output<typeof props>, lang),
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    service: text(28),
    with: text(24).optional(),
    date: isoDate,
    time: clock,
    minutes: z.int().min(5).max(600),
    place: text(40).optional(),
    price: z.number().min(0).optional(),
    status: z.enum(["confirmed", "pending", "cancelled", "done"]),
    policy: text(100).optional(),
    goto: screenId,
    style: z.enum(["card", "summary"]).default("card"),
  })
  .refine(({ policy, style }) => !policy || style === "summary", { path: ["policy"] })
  // Cancel is an action, never a link to the reschedule target. This holder is code-owned.
  .overwrite((value) => ({
    ...value,
    ...(value.detail === "brief" ? { with: undefined, place: undefined } : {}),
    policy: value.policy ? balancedLine(value.policy) : undefined,
    cancel: {},
  }));
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const item = cast.items[0];
  return {
    service: (item && titleOf(item, 28, thingOf(cast, item.type))) || placeholderTitle(0, lang),
    date: "2026-11-18",
    time: "09:00",
    minutes: 30,
    status: "pending",
    goto: "details",
  };
}
export const examples = [
  {
    style: "card",
    service: "Plant care visit",
    with: "Anna",
    date: "2026-11-20",
    time: "09:00",
    minutes: 30,
    place: "Home",
    price: 20,
    status: "confirmed",
    goto: "time",
  },
  {
    style: "summary",
    density: "compact",
    service: "Morning park walk",
    with: "Sam",
    date: "2026-11-21",
    time: "10:00",
    minutes: 60,
    price: 25,
    status: "pending",
    policy: "Move or cancel up to two hours before.",
    goto: "time",
  },
  // prettier-ignore
  { service: "Home visit", with: "Sam", place: "Home", date: "2026-11-22", time: "16:00",
    minutes: 30, price: 15, status: "confirmed", goto: "time", detail: "brief" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Appointment");
export const probes = [
  choose("Show my one booked visit with its date, time and duration and actions to move or cancel it"),
  choose("Show a simple tappable preview of my fern with a little detail", "Card"),
  write("Confirmed 30 minute park walk on 2026-11-20 at 09:00 with Sam, price 15, reschedule to time"),
  {
    ...write(
      "Show the confirmed 30-minute park walk at 09:00 on 2026-11-20 for 15, reschedule to time. Save Sam as the walker and Riverside as the place, but hide who and where from the card.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Cancel this appointment", { address: "a1/cancel", action: "press" }),
  {
    ...read("Edit the booking details before confirming", { address: "a1/edit", action: "press" }),
    screen: 1,
  },
] satisfies Probe[];
type AppointmentText = { value: string; part: string; loading: boolean; density: ThemeDensity };
function AppointmentLine({ value, part, loading, density }: AppointmentText) {
  const number = ["time", "price", "minutes"].includes(part);
  const role = number ? "number" : "label";
  const scale = part === "time" ? "display" : "compact";
  if (loading)
    return (
      <KitSkeleton shape="figure" inset="none" density={density} content={[[role, value, "start", scale]]} />
    );
  return (
    <KitText
      role={role}
      density={density}
      numberScale={scale}
      tone={["date", "time", "service", "price", "minutes"].includes(part) ? "text" : "muted"}
      tabular={number}
      part={part}
    >
      {value}
    </KitText>
  );
}
export function Appointment(input: Props<typeof props, typeof meta>) {
  const { lang, words } = useWords();
  const { appointmentLabels } = bookingWordsFor(lang);
  const state = useComponentState();
  const loading = state === "loading";
  const active = state === "filled";
  const card = input.style === "card";
  const date = appointmentDate(input.date, lang);
  const badge = state === "success" ? appointmentLabels.booked : appointmentLabels[input.status];
  const change = card ? "reschedule" : "edit";
  const density = useVariant("density", meta.variants.density, input.density);
  const finish = { loading, density };
  return (
    <KitCard
      padded
      part="root"
      goto={active ? input.goto : undefined}
      label={input.service}
      density={density}
    >
      <AppointmentLine value={date} part="date" {...finish} />
      <KitGrid density={density}>
        <AppointmentLine value={timeOfDayLine(input.time, lang)} part="time" {...finish} />
        {card && (
          <KitContent
            lead={<KitTrail kind="badge" part="status" value={loading ? words.loadingLabel : badge} />}
            leadingAlign="row"
          >
            {null}
          </KitContent>
        )}
      </KitGrid>
      <KitContent>
        <AppointmentLine value={input.service} part="service" {...finish} />
        <KitGrid density={density}>
          {appointmentDetails(input, lang)
            .filter(({ part }) => part !== "policy")
            .flatMap(({ part, text }, index) => [
              ...(part === "price" && index % 2 === 0
                ? [<KitContent key="price-gap">{null}</KitContent>]
                : []),
              <AppointmentLine key={part} value={text} part={part} {...finish} />,
            ])}
        </KitGrid>
        {input.policy && <AppointmentLine value={input.policy} part="policy" {...finish} />}
      </KitContent>
      <KitAction label={appointmentLabels[change]} part={change} goto={input.goto} disabled={!active} full />
      {card && <KitAction label={words.cancelLabel} kind="quiet" part="cancel" disabled={!active} full />}
    </KitCard>
  );
}

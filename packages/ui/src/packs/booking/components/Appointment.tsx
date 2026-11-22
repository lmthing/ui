// prettier-ignore
import { KitAction, KitCard, KitContent, KitGrid, KitSkeleton, KitText, KitTrail,
  useComponentState, useWords,
  useKit,
} from "../../../kit";
import { bookingWordsFor } from "../lang";
import { z } from "zod";
// prettier-ignore
import {
  appointmentDate, balancedLine, clock, isoDate, placeholderTitle, probesFor, screenId, text,
  timeOfDayLine, thingOf, titleOf, type ThemeDensity, type FallbackInput, type Meta,
  type Probe, type Props,
  variantProps,
} from "../../../catalog";
import { appointmentCanJoin, appointmentDetails, appointmentReading } from "../copy";
import { prompt } from "../../../entry/prompt-Appointment.generated";
// Core first: Card/plain previews a record, not structured booking terms and reschedule/cancel.
export const meta = {
  id: "Appointment",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A booking record stored on the provider's device.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["with", "place"] } },
  // prettier-ignore
  parts: [
    "root", "service", "with", "date", "time", "minutes", "place", "price", "status",
    "policy", "reschedule", "cancel", "edit", "location", "join", "join_label",
  ],
  partTiers: { join: "service" },
  confirmParts: ["cancel"],
  states: ["filled", "loading", "success"],
  // prettier-ignore
  actions: {
    parts: { root: ["press"], reschedule: ["press"], cancel: ["press"], edit: ["press"], join: ["press"] },
    when: { reschedule: { style: "card" }, cancel: { style: "card" }, edit: { style: "summary" }, join: { joinable: true } },
    noGoto: { parts: ["join"] },
  },
  read: (input, _state, lang?: string): string[] => appointmentReading(input as z.output<typeof props>, lang),
} as const satisfies Meta;
const httpsUrl = z.url({ protocol: /^https$/ });
// prettier-ignore
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    service: text(28),
    with: text(24).optional(),
    date: isoDate,
    time: clock,
    minutes: z.int().min(5).max(600),
    place: text(40).optional(),
    locationKind: z.enum(["in_person", "video", "phone"]).optional(),
    meetingUrl: text(200).refine((url) => /^https:\/\//i.test(url) && httpsUrl.safeParse(url).success,
      "Use an HTTPS URL").meta({ kind: "url" }).optional(),
    price: z.number().min(0).optional(),
    status: z.enum(["confirmed", "pending", "cancelled", "done"]),
    policy: text(100).optional(),
    goto: screenId,
    style: z.enum(["card", "summary", "compact"]).default("card"),
  })
  .refine(({ policy, style }) => !policy || style === "summary", { path: ["policy"] })
  // Cancel is an action, never a link to the reschedule target. This holder is code-owned.
  .overwrite((value) => ({
    ...value,
    ...(value.detail === "brief" || value.style === "compact" ? { with: undefined, place: undefined } : {}),
    policy: value.policy ? balancedLine(value.policy) : undefined,
    cancel: {},
    joinable: appointmentCanJoin(value.status, value.locationKind, value.meetingUrl),
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
// prettier-ignore
const plantBooking = {
  style: "card", service: "Plant care visit", with: "Anna", date: "2026-11-20", time: "09:00",
  minutes: 30, place: "Home", price: 20, status: "confirmed", goto: "time",
} satisfies z.input<typeof props>;
// prettier-ignore
export const examples = [
  plantBooking,
  {
    style: "summary", service: "Morning park walk", with: "Sam", date: "2026-11-21", time: "10:00",
    minutes: 60, price: 25, status: "pending", policy: "Move or cancel up to two hours before.", goto: "time",
  },
  { ...plantBooking },
  { ...plantBooking, detail: "brief" },
  { ...plantBooking, style: "compact", locationKind: "in_person" },
  { ...plantBooking, service: "Plant care video visit", locationKind: "video",
    meetingUrl: "https://meet.example.org/ledge", place: undefined },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Appointment");
// prettier-ignore
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
  { ...write("Show my confirmed 30-minute plant care visit on 2026-11-20 at 09:00 in a single compact summary row. Open time from the card."),
    expectProps: { style: "compact" } },
  { ...write("Show my confirmed 30-minute phone appointment for dog-walking advice on 2026-11-20 at 09:00, with rescheduling to time."),
    expectProps: { locationKind: "phone" } },
  { ...write("Show my confirmed 30-minute plant care video visit on 2026-11-20 at 09:00. Use https://meet.example.org/ledge for the join button, and time to reschedule."),
    expectProps: { status: "confirmed", locationKind: "video", meetingUrl: "https://meet.example.org/ledge" } },
  read("Cancel this appointment", { address: "a1/cancel", action: "press" }),
  {
    ...read("Edit the booking details before confirming", { address: "a1/edit", action: "press" }),
    screen: 1,
  },
  { ...read("Join this video meeting", { address: "a1/join", action: "press" }), screen: 5 },
] satisfies Probe[];
type AppointmentText = {
  value: string;
  part: string;
  loading: boolean;
  density: ThemeDensity;
  compact?: boolean;
};
// prettier-ignore
function AppointmentLine({ value, part, loading, density, compact }: AppointmentText) {
  const number = ["time", "price", "minutes"].includes(part);
  const role = number ? "number" : "label";
  const scale = part === "time" && !compact ? "display" : "compact";
  const align = part === "price" ? "end" : "start";
  const tone = (number || ["date", "service"].includes(part)) ? "text" : "muted";
  return loading
    ? <KitSkeleton shape="figure" inset="none" density={density} content={[[role, value, align, scale]]} />
    : <KitText {...{ role, density, align, tone, part }} numberScale={scale} tabular={number}>{value}</KitText>;
}
// prettier-ignore
export function Appointment(input: Props<typeof props, typeof meta>) {
  const { lang, words } = useWords();
  const { appointmentLabels, appointmentJoin } = bookingWordsFor(lang);
  const state = useComponentState();
  const loading = state === "loading";
  const active = state === "filled";
  const card = input.style === "card";
  const badge = state === "success" ? appointmentLabels.booked : appointmentLabels[input.status];
  const compact = input.style === "compact";
  const change = card ? "reschedule" : "edit";
  const density = useKit().density;
  const finish = { loading, density };
  const date = <AppointmentLine value={appointmentDate(input.date, lang)} part="date" {...finish} />;
  const line = ({ part, text }: { part: string; text: string }) => (
    <AppointmentLine key={part} value={text} part={part} {...finish} />
  );
  const details = appointmentDetails(input, lang);
  const location = details.find(({ part }) => part === "location");
  const status = <KitTrail kind="badge" part="status" value={loading ? words.loadingLabel : badge} />;
  const join = appointmentCanJoin(input.status, input.locationKind, input.meetingUrl) &&
    <KitAction label={appointmentJoin} part="join" disabled={!active} full />;
  const time = <AppointmentLine value={timeOfDayLine(input.time, lang)} part="time" compact={compact || Boolean(join)} {...finish} />;
  return (
    <KitCard padded part="root" goto={active ? input.goto : undefined} label={input.service} density={density}>
      {compact ? <><KitGrid fitLast density={density}>
        <KitContent>
          <AppointmentLine value={input.service} part="service" {...finish} />
          <KitContent lead={date} leadingAlign="row" density={density}>{time}</KitContent>
          {location && line(location)}
        </KitContent>
        {status}
      </KitGrid>{join}</> : <>
        {!join && date}
        <KitGrid fitLast density={density}>
          {join ? <KitContent density={density}>{date}{time}</KitContent> : time}
          {card && status}
        </KitGrid>
        <KitContent>
          <AppointmentLine value={input.service} part="service" {...finish} />
          {details.filter(({ part }) => part === "with" || part === "place" || part === "location").map(line)}
          <KitGrid fitLast density={density}>
            {details.filter(({ part }) => part === "minutes" || part === "price").map(line)}
          </KitGrid>
          {input.policy && <AppointmentLine value={input.policy} part="policy" {...finish} />}
        </KitContent>
        {join}
        <KitAction label={appointmentLabels[change]} kind="secondary" part={change} goto={input.goto} disabled={!active} full />
        {card && <KitAction label={words.cancelLabel} kind="quiet" part="cancel" disabled={!active} full />}
      </>}
    </KitCard>
  );
}

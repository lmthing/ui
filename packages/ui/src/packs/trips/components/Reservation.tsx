import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { reservationReading, reservationStampParts } from "../copy";
import { tripsWordsFor } from "../lang";

// Core first: KeyValue/default cannot draw a travel ticket with a copyable reference and scannable pass.
export const meta = {
  id: "Reservation",
  status: "ready",
  group: "content",
  purpose: "Keep a travel confirmation, reference and gate pass together.",
  pick: "One travel or lodging confirmation, with a copyable reference, optional seat and optional scannable pass. Not simple label/value facts (KeyValue), booking a provider (Appointment), running an event (Ticket), or buying goods (OrderSummary).",
  writeHints: [
    'start and end are objects with date (YYYY-MM-DD) and time (HH:MM). Omit style for the standard ticket card. Use style "pass" and code true for a full-width scannable gate pass.',
    'For a brief ticket, use detail "brief" and keep the authored seat or room in seat. Set density and align to JSON null unless specifically asked for different spacing or alignment; never write "comfortable" or "start" as defaults.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Confirmation details are typed or pasted onto the device; live flight status would need a service.",
  variants: { density: ["comfortable", "compact"], align: ["start", "center"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["seat"] } },
  parts: [
    "root",
    "kind",
    "title",
    "from",
    "to",
    "start",
    "end",
    "ref",
    "ref_value",
    "ref_icon",
    "seat",
    "code",
  ],
  states: ["filled", "loading"],
  actions: { parts: { ref: ["press"], root: ["press"] } },
  read: (input, state, lang): string[] =>
    state === "filled" ? reservationReading(input as z.output<typeof props>, lang) : [],
} as const satisfies c.Meta;

const stamp = z.strictObject({ date: c.isoDate, time: c.clock });
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    kind: z.enum(["flight", "train", "bus", "ferry", "stay", "car", "ticket"]),
    title: c.text(32),
    from: c.text(20).optional(),
    to: c.text(20).optional(),
    start: stamp,
    end: stamp.optional(),
    ref: c.text(12),
    seat: c.text(12).optional(),
    code: z.boolean().default(false),
    style: z.literal("pass").optional(),
  })
  .refine(({ style, code }) => style !== "pass" || code, { path: ["code"] })
  .overwrite((input) => (input.detail === "brief" ? { ...input, seat: undefined } : input));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const item = c.itemsOf(cast, 1)[0];
  return {
    kind: "ticket",
    title: (item && c.titleOf(item, 32, c.thingOf(cast))) ?? c.placeholderTitle(0, lang),
    start: { date: "2026-11-20", time: "09:00" },
    ref: c.wordsFor(lang).placeholderValue,
  };
}

export const examples = [
  {
    kind: "stay",
    title: "Kyoto Garden Inn",
    to: "Kyoto",
    start: { date: "2027-03-07", time: "15:00" },
    end: { date: "2027-03-10", time: "10:00" },
    ref: "KY7M4",
    seat: "Room 204",
  },
  {
    kind: "train",
    title: "Shinkansen to Kyoto",
    from: "Tokyo",
    to: "Kyoto",
    start: { date: "2027-03-07", time: "08:30" },
    end: { date: "2027-03-07", time: "10:40" },
    ref: "JP8K2",
    seat: "8A",
    code: true,
    style: "pass",
    align: "center",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Reservation");
export const probes = [
  choose(
    "Show my already-booked train ticket with a seat number, a copyable reference and a scannable gate code",
  ),
  choose(
    "Show a plain set of label/value pairs for one hotel: address, Wi-Fi network and checkout time",
    "KeyValue",
  ),
  write(
    "Make a full-width train pass with a scannable code for Tokyo to Kyoto on 2027-03-07 at 08:30, ref JP8K2 and seat 8A.",
  ),
  {
    ...write(
      "Show my confirmed Tokyo to Kyoto train for 2027-03-07 at 08:30, reference JP8K2. Keep seat 8A in the booking data, but use the brief display that hides the seat assignment. Leave spacing and alignment unchanged.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Copy the Kyoto Garden Inn confirmation reference", { address: "r1/ref", action: "press" }),
] satisfies c.Probe[];

type ReservationProps = c.Props<typeof props, typeof meta>;
type Finish = { density: c.ThemeDensity; align: "start" | "center" };

// prettier-ignore
function ReservationStop({ part, kind, place, stamp, finish, loading }: {
  kind: ReservationProps["kind"];
  part: "start" | "end"; place: string | undefined; stamp: ReservationProps["end"];
  finish: Finish; loading: boolean;
}) {
  const { lang, words } = kit.useWords(tripsWordsFor);
  const label = words.reservationStops(kind)[part];
  const slot = stamp && reservationStampParts(stamp, lang);
  return <kit.KitContent group={finish.density === "compact" ? "content" : "response"} {...finish}>
    {loading ? <kit.KitSkeleton shape="figure" inset="none" density={finish.density}
      content={[["caption", label, finish.align], ["number", slot?.time, finish.align, "compact"],
        ["caption", slot?.date, finish.align], ["body", place, finish.align]]} />
      : <>
        <kit.KitText part={null} role="caption" tone="muted" {...finish}>{label}</kit.KitText>
        {slot && <>
          <kit.KitText part={part} role="number" numberScale="compact" tabular {...finish}>{slot.time}</kit.KitText>
          <kit.KitText part={null} role="caption" tone="muted" {...finish}>{slot.date}</kit.KitText>
        </>}
        {place && <kit.KitText part={part === "start" ? "from" : "to"} role="body" {...finish}>{place}</kit.KitText>}
      </>}
  </kit.KitContent>;
}

// prettier-ignore
function ReservationBody({ input, finish, loading }: { input: ReservationProps; finish: Finish; loading: boolean }) {
  const { words } = kit.useWords(tripsWordsFor), { kind, title, from, to, start, end, seat } = input;
  const kindLabel = words.reservationKinds[kind];
  const seatLabel = seat && words.reservationSeat(kind, seat);
  const depart = <ReservationStop part="start" place={from} stamp={start} {...{ kind, finish, loading }} />;
  const arrive = <ReservationStop part="end" place={to} stamp={end} {...{ kind, finish, loading }} />;
  return <>
    <kit.KitContent {...finish}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" density={finish.density}
        content={[["caption", kindLabel, finish.align], ["heading", title, finish.align]]} />
        : <>
          <kit.KitText part="kind" role="caption" tone="muted" {...finish}>{kindLabel}</kit.KitText>
          <kit.KitText part="title" role="heading" {...finish}>{title}</kit.KitText>
        </>}
    </kit.KitContent>
    {to || end ? <kit.KitGrid density={finish.density}>{depart}{arrive}</kit.KitGrid> : depart}
    {seatLabel && (loading
      ? <kit.KitSkeleton shape="figure" inset="none" density={finish.density} content={[["caption", seatLabel, finish.align]]} />
      : <kit.KitText part="seat" role="caption" tone="muted" {...finish}>{seatLabel}</kit.KitText>)}
  </>;
}

// prettier-ignore
export function Reservation(input: ReservationProps) {
  const { title, ref, code, style } = input;
  const loading = kit.useComponentState() === "loading";
  const { words } = kit.useWords(tripsWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const align = kit.useVariant("align", meta.variants.align, input.align);
  const finish = { density, align };
  const stub = <kit.KitGrid fitLast density={density}>
    <kit.KitContent {...finish}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density}
        content={[["caption", words.reservationRef, align], ["heading", ref, align]]} />
        : <>
          <kit.KitText part={null} role="caption" tone="muted" {...finish}>{words.reservationRef}</kit.KitText>
          <kit.KitText part="ref_value" role="heading" {...finish}>{ref}</kit.KitText>
        </>}
    </kit.KitContent>
    {loading ? <kit.KitSkeleton shape="control" inset="none" kind="quiet" />
      : <kit.KitAction action="press" part="ref" kind="quiet" icon="clipboard" a11y={words.copyReservationRef} />}
  </kit.KitGrid>;
  return <kit.KitTicket part="root" style={style ?? "card"} label={words.openReservation(title)}
    {...(!loading && { target: { part: "root" } })}
    code={code ? <kit.KitContent {...finish}>
      {stub}
      <kit.KitCode part={loading ? null : "code"} value={ref} label={words.reservationCode} loading={loading} />
    </kit.KitContent> : stub}>
    <ReservationBody {...{ input, finish, loading }} />
  </kit.KitTicket>;
}

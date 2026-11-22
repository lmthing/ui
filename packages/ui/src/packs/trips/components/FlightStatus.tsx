import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { flightReading, flightView } from "../copy";
import { tripsWordsFor } from "../lang";

// Core first: KeyValue/pairs lists static booking facts, not flight progress or live schedule changes.
// prettier-ignore
export const meta = {
  id: "FlightStatus",
  status: "ready",
  group: "data",
  tier: "service",
  pick: "Live operational status, gate updates and progress for one specific flight. Not static facts (KeyValue), a boarding pass (Reservation) or airport-wide boards (Departures).",
  purpose: "Track one booked flight's live status, airport details and progress.",
  writeHints: [
    'Use local HH:MM for each airport; progress is a fraction, not a percent. Only write an estimate if known. For a single strip with status, gate and departure, set detail to "brief". Leave density and surface null unless explicitly requested; do not write "card" for the default surface.',
  ],
  region: "body",
  weight: 2,
  realPath:
    "live flight status, gate changes, and airborne progress fetched from an aviation status service.",
  variants: { detail: ["full", "brief"], density: ["comfortable", "compact"], surface: ["card", "plain"] },
  variantParts: { "detail.brief": {
    hides: ["route", "origin_city", "destination_city", "arrival", "estimated_arrival", "terminal", "baggage"],
  } },
  parts: [
    "root", "flight", "airline", "status", "route", "origin_city", "destination_city",
    "departure", "estimated_departure", "arrival", "estimated_arrival", "gate", "terminal",
    "baggage", "notice", "refresh", "inbound", "inbound_label",
  ],
  actions: { parts: { refresh: ["press"], inbound: ["press"] }, when: { inbound: { linked: true } } },
  hostCommands: { parts: { "refresh.press": {
    kind: "command", name: "refresh_flight", input: ({ props }) => ({ flight: String(props.flight) }),
  } } },
  errorActions: ["refresh.press"],
  partTiers: { inbound: "phone", refresh: "service" },
  states: ["filled", "loading", "error"],
  read: (input, state, lang): string[] =>
    state === "filled" ? flightReading(input as Parameters<typeof flightReading>[0], lang) : [],
} as const satisfies c.Meta;
// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  flight: c.text(10),
  airline: c.text(24),
  origin: c.text(4),
  originCity: c.text(20),
  destination: c.text(4),
  destinationCity: c.text(20),
  scheduledDep: c.clock,
  estimatedDep: c.clock.optional(),
  scheduledArr: c.clock,
  estimatedArr: c.clock.optional(),
  status: z.enum(["scheduled", "on_time", "delayed", "boarding", "in_air", "landed", "cancelled"]),
  progress: z.number().min(0).max(1).optional(),
  terminal: c.text(8).optional(),
  gate: c.text(8).optional(),
  baggage: c.text(12).optional(),
  inboundFlight: c.text(10).optional(),
  inboundGoto: c.screenId.optional(),
}).refine(({ inboundGoto, inboundFlight }) => !inboundGoto || !!inboundFlight, { path: ["inboundGoto"] })
  .overwrite((input) => ({
    ...input, linked: Boolean(input.inboundGoto), inbound: input.inboundGoto ? { goto: input.inboundGoto } : undefined,
  }));
export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 4);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && c.titleOf(item, max, thing)) || c.clip(c.placeholderTitle(index, lang), max);
  }
  return {
    flight: castTitle(10, 0),
    airline: castTitle(24, 1),
    origin: c.clip(c.wordsFor(lang).placeholderValue, 4),
    originCity: castTitle(20, 2),
    destination: c.clip(c.wordsFor(lang).placeholderValue, 4),
    destinationCity: castTitle(20, 3),
    scheduledDep: "00:00",
    scheduledArr: "00:00",
    status: "scheduled",
  };
}

// prettier-ignore
export const examples = [
  {
    flight: "NH 212", airline: "All Nippon Airways", origin: "LHR", originCity: "London",
    destination: "HND", destinationCity: "Tokyo", scheduledDep: "19:00", estimatedDep: "19:45",
    scheduledArr: "17:20", estimatedArr: "18:05", status: "in_air", progress: 0.62, terminal: "2",
    gate: "B42", baggage: "Carousel 5", inboundFlight: "NH 211", inboundGoto: "inbound_flight",
  },
  {
    flight: "TP 1357", airline: "TAP Air Portugal", origin: "LHR", originCity: "London",
    destination: "LIS", destinationCity: "Lisbon", scheduledDep: "12:25",
    scheduledArr: "15:10", status: "boarding", gate: "A18", detail: "brief",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("FlightStatus");
const brief =
  "Track my booked flight TP 1357 on TAP Air Portugal, London LHR to Lisbon LIS. Scheduled off at 12:25 and in at 15:10 local. It is boarding at gate A18.";
// prettier-ignore
export const probes = [
  choose("Show whether my booked flight NH 212 is boarding, delayed or in the air right now, with live gate updates and how far it has flown."),
  choose("I want a plain table of two static facts: my travel agent and its phone number. No ticket, flight or live updates.", "KeyValue"),
  choose("Give me the boarding pass for my booked flight, with my seat and booking reference and a code to scan.", "Reservation"),
  write(brief),
  { ...write(`${brief} Show a short strip with only the flight status, gate and departure, without the route and arrival details.`), variant: { axis: "detail", value: "brief" } },
  read("Open the linked inbound aircraft's previous leg NH 211.", { address: "f1/inbound", action: "press" }),
] satisfies c.Probe[];

type FlightProps = c.Props<typeof props, typeof meta>;
type FlightView = ReturnType<typeof flightView>;

// prettier-ignore
function FlightTimes({ view, density }: { view: FlightView; density: FlightProps["density"] }) {
  return <kit.KitRowGroup density={density}>
    {view.times.map(({ part, title, scheduled, estimated, estimatePart, estimateTime, scheduledNote }) =>
      <kit.KitGrid key={part} density={density}>
        <kit.KitLayoutText line={{ text: title, role: "meta" }} density={density} />
        <kit.KitContent density={density}>
          <kit.KitLayoutText line={{ text: estimateTime ?? scheduled, part: estimated ? estimatePart : part, role: "meta", strong: true, tabular: true }} align="end" density={density} />
          <kit.KitLayoutText line={{ text: scheduledNote, part, role: "meta", tone: "muted", tabular: true }} align="end" density={density} />
        </kit.KitContent>
      </kit.KitGrid>)}
  </kit.KitRowGroup>;
}

// prettier-ignore
function FlightRoute({ input, view, density }: { input: FlightProps; view: FlightView; density: FlightProps["density"] }) {
  const loading = kit.useComponentState() === "loading";
  const { words: { flightStatus } } = kit.useWords(tripsWordsFor);
  return <kit.KitFigure density={density} media={<kit.KitContent density={density} align="center">
    {input.progress !== undefined && <kit.KitRing part="route" value={loading ? 0 : input.progress} of={1}>
      <kit.KitContent density={density} align="center">
        <kit.KitLayoutText line={{ text: view.progress, role: "figure", tabular: true }} align="center" density={density} />
        <kit.KitLayoutText line={{ text: flightStatus.ofRoute, role: "meta", tone: "muted" }} align="center" density={density} />
      </kit.KitContent>
    </kit.KitRing>}
    <kit.KitLayoutText line={{ text: view.route, part: input.progress === undefined ? "route" : null, role: "meta", strong: true }} align="center" density={density} />
  </kit.KitContent>} caption={<kit.KitGrid density={density}>
    <kit.KitLayoutText line={{ text: input.originCity, part: "origin_city", role: "meta", tone: "muted" }} align="center" density={density} />
    <kit.KitLayoutText line={{ text: input.destinationCity, part: "destination_city", role: "meta", tone: "muted" }} align="center" density={density} />
  </kit.KitGrid>} />;
}

// prettier-ignore
export function FlightStatus(input: FlightProps) {
  const { lang, words: { flightStatus } } = kit.useWords(tripsWordsFor);
  const state = kit.useComponentState(), loading = state === "loading";
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const view = flightView(input, lang);
  const heading = <kit.KitGrid fitLast density={density}>
    <kit.KitHeader title={{ text: input.flight, part: "flight" }} meta={{ text: input.airline, part: "airline" }} density={density} />
    <kit.KitTrail kind="badge" value={view.status} tone={view.tone} part="status" />
  </kit.KitGrid>;
  const refresh = <kit.KitAction part="refresh" label={flightStatus.refresh} kind="quiet" action="press" full={state === "error"} contentParts={{}} />;
  if (state === "error") return <kit.KitCard part="root" padded {...{ density, surface }}>
    <kit.KitContent density={density} align="center">
      <kit.KitState retain part="notice" message={flightStatus.error} density="compact">{refresh}</kit.KitState>
    </kit.KitContent>
  </kit.KitCard>;
  const footer = <kit.KitActionFooter density={density}>
    {refresh}
    {view.inbound && (input.inboundGoto
      ? <kit.KitAction part="inbound" label={view.inbound} goto={input.inboundGoto} kind="quiet" action="press" contentParts={{ label: "inbound_label" }} />
      : <kit.KitLayoutText line={{ text: view.inbound, part: "inbound_label", role: "meta" }} density={density} />)}
  </kit.KitActionFooter>;
  const content = <>
    {heading}
    {view.route && <FlightRoute {...{ input, view, density }} />}
    <FlightTimes {...{ view, density }} />
    {view.details.length > 0 && <kit.KitGrid columns={3} density={density}>
      {view.details.map(({ part, label, value }) => <kit.KitMetaLine key={part}
        title={{ text: value, part, role: "meta", strong: true }} meta={{ text: label, role: "meta" }} density={density} />)}
    </kit.KitGrid>}
  </>;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    <kit.KitState part="notice" loading={<>{content}{footer}</>} message={flightStatus.error} density={density}>
      {content}
    </kit.KitState>
    {!loading && footer}
  </kit.KitCard>;
}

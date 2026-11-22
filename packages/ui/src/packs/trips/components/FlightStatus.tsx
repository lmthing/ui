import { z } from "zod";
import {
  clip,
  clock,
  itemsOf,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";

// Core first: KeyValue/pairs lists static booking facts, not flight progress or live schedule changes.
export const meta = {
  id: "FlightStatus",
  status: "draft",
  group: "data",
  tier: "service",
  pick: "Live operational status, gate updates and progress for one specific flight. Not static facts (KeyValue), a boarding pass (Reservation) or airport-wide boards (Departures).",
  purpose: "Track one booked flight's live status, airport details and progress.",
  region: "body",
  weight: 2,
  realPath:
    "live flight status, gate changes, and airborne progress fetched from an aviation status service.",
  parts: ["root", "refresh", "inbound"],
  actions: { parts: { refresh: ["press"], inbound: ["press"] } },
  states: ["filled", "loading", "error"],
} as const satisfies Meta;
export const props = z.strictObject({
  flight: text(10),
  airline: text(24),
  origin: text(4),
  originCity: text(20),
  destination: text(4),
  destinationCity: text(20),
  scheduledDep: clock,
  estimatedDep: clock.optional(),
  scheduledArr: clock,
  estimatedArr: clock.optional(),
  status: z.enum(["scheduled", "on_time", "delayed", "boarding", "in_air", "landed", "cancelled"]),
  progress: z.number().min(0).max(1).optional(),
  terminal: text(8).optional(),
  gate: text(8).optional(),
  baggage: text(12).optional(),
  inboundFlight: text(10).optional(),
  inboundGoto: screenId.optional(),
  style: z.enum(["card", "compact"]).default("card"),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 1);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    flight: castTitle(10, 0),
    airline: castTitle(24, 0),
    origin: castTitle(4, 0),
    originCity: castTitle(20, 0),
    destination: castTitle(4, 0),
    destinationCity: castTitle(20, 0),
    scheduledDep: "00:00",
    scheduledArr: "00:00",
    status: "scheduled",
  };
}

// TODO: Replace the neutral seed with two real examples covering styles and optional fields.
export const examples = [fallback({ cast: { things: [], items: [] } })] satisfies z.input<typeof props>[];

// TODO: Replace the probe prompts and verify the fixture address and any action gates.
const { choose, write, read } = probesFor("FlightStatus");
export const probes = [
  choose("TODO: describe the need this component should win"),
  choose("TODO: describe the nearest wrong choice", "Reservation"),
  write("TODO: describe realistic values and intent in the person’s words"),
  read("TODO: ask for this action in the person’s words", { address: "c1/refresh", action: "press" }),
] satisfies Probe[];

export function FlightStatus(_input: Props<typeof props, typeof meta>) {
  return null;
}

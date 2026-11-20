import { z } from "zod";
import {
  appointmentDate,
  clock,
  isoDate,
  itemsOf,
  placeholderTitle,
  placeholderValue,
  probesFor,
  text,
  thingOf,
  timeOfDayLine,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: KeyValue/default cannot draw a travel ticket with a copyable reference and scannable pass.
export const meta = {
  id: "Reservation",
  status: "draft",
  group: "content",
  purpose: "Keep a travel confirmation, reference and gate pass together.",
  pick: "One travel or lodging confirmation, with a copyable reference, optional seat and optional scannable pass. Not simple label/value facts (KeyValue), booking a provider (Appointment), running an event (Ticket), or buying goods (OrderSummary).",
  writeHints: [
    'start and end are objects with date (YYYY-MM-DD) and time (HH:MM). Omit style for the standard ticket card. Use style "pass" and code true for a full-width scannable gate pass.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Confirmation details are typed or pasted onto the device; live flight status would need a service.",
  variants: { density: ["comfortable", "compact"], align: ["start", "center"] },
  parts: ["root", "kind", "title", "from", "to", "start", "end", "ref", "seat", "code"],
  states: ["filled", "loading"],
  actions: { parts: { ref: ["press"], root: ["press"] } },
  read: (input, state, lang) => {
    if (state !== "filled") return [];
    const { start, end } = input as { start: z.output<typeof stamp>; end?: z.output<typeof stamp> };
    return (end ? [start, end] : [start]).map(
      ({ date, time }) => `${appointmentDate(date, lang)} ${timeOfDayLine(time, lang)}`,
    );
  },
} as const satisfies Meta;

const stamp = z.strictObject({ date: isoDate, time: clock });
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    kind: z.enum(["flight", "train", "bus", "ferry", "stay", "car", "ticket"]),
    title: text(32),
    from: text(20).optional(),
    to: text(20).optional(),
    start: stamp,
    end: stamp.optional(),
    ref: text(12),
    seat: text(12).optional(),
    code: z.boolean().default(false),
    style: z.literal("pass").optional(),
  })
  .refine(({ style, code }) => style !== "pass" || code, { path: ["code"] });

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const item = itemsOf(cast, 1)[0];
  return {
    kind: "ticket",
    title: (item && titleOf(item, 32, thingOf(cast))) ?? placeholderTitle(0, lang),
    start: { date: "2026-11-20", time: "09:00" },
    ref: placeholderValue,
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
    density: "compact",
    align: "center",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Reservation");
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
  read("Copy the Kyoto Garden Inn confirmation reference", { address: "r1/ref", action: "press" }),
] satisfies Probe[];

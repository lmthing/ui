import { z } from "zod";
import {
  clock,
  isoDate,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Card/plain previews a record, not structured booking terms and reschedule/cancel.
export const meta = {
  id: "Appointment",
  status: "draft",
  group: "content",
  purpose: "See, change or confirm one booking with its time and terms.",
  pick: "One booking with structured date, time, duration and change or cancellation actions. Not a simple record preview (Card), the day's bookings in order (Timeline), free start times (Slots), or goods ordered (OrderSummary).",
  writeHints: ['policy is only allowed with style: "summary". For style: "card", omit policy or write null.'],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A booking record stored on the provider's device.",
  parts: [
    "root",
    "service",
    "with",
    "date",
    "time",
    "minutes",
    "place",
    "price",
    "status",
    "policy",
    "reschedule",
    "cancel",
    "edit",
  ],
  confirmParts: ["cancel"],
  states: ["filled", "loading", "success"],
  actions: {
    parts: { root: ["press"], reschedule: ["press"], cancel: ["press"], edit: ["press"] },
    when: { reschedule: { style: "card" }, cancel: { style: "card" }, edit: { style: "summary" } },
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
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
  .refine(({ policy, style }) => !policy || style === "summary", { path: ["policy"] });
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const item = cast.items[0];
  return {
    service: (item && titleOf(item, 28, thingOf(cast, item.type))) || placeholderTitle(0),
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
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Appointment");
export const probes = [
  choose("Show my one booked visit with its date, time and duration and actions to move or cancel it"),
  choose("Show a simple tappable preview of my fern with a little detail", "Card"),
  write("Confirmed 30 minute park walk on 2026-11-20 at 09:00 with Sam, price 15, reschedule to time"),
  read("Cancel this appointment", { address: "a1/cancel", action: "press" }),
] satisfies Probe[];

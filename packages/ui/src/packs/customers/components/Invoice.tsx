import { z } from "zod";
import {
  isoDate,
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: KeyValue/rows cannot show quantity-price lines, computed tax totals and bill/quote actions.
export const meta = {
  id: "Invoice",
  status: "draft",
  group: "content",
  purpose: "Bill a client or quote work before they accept it.",
  pick: "A business's bill or quote to a client, with quantity-price lines, tax and sending. Not plain details (KeyValue), personal bills to pay (Bills), or a shop order (OrderSummary).",
  writeHints: [
    "Write only line quantities and unit prices plus optional tax percent; code computes subtotal, tax, total and overdue.",
    'style: "quote" cannot have status: "paid". Use draft or sent for quotes.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "A document made on the device; sending it needs email or SMS.",
  items: { key: "lines", parts: ["root", "item", "qty", "price"] },
  parts: [
    "root",
    "number",
    "to",
    "date",
    "due",
    "subtotal",
    "tax",
    "total",
    "status",
    "note",
    "send",
    "accept",
    "decline",
  ],
  partTiers: { send: "service" },
  confirmParts: ["decline"],
  states: ["filled", "success"],
  actions: {
    parts: { send: ["press"], accept: ["press"], decline: ["press"] },
    when: { accept: { style: "quote" }, decline: { style: "quote" } },
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    number: text(12),
    to: text(28),
    date: isoDate,
    due: isoDate.optional(),
    lines: z
      .array(
        z.strictObject({
          item: text(32),
          qty: z.number().positive(),
          price: z.number().min(0),
        }),
      )
      .min(1)
      .max(8),
    tax: z.number().min(0).max(100).optional(),
    status: z.enum(["draft", "sent", "paid"]),
    note: text(100).optional(),
    style: z.enum(["invoice", "quote"]).default("invoice"),
  })
  .refine(({ status, style }) => style !== "quote" || status !== "paid", { path: ["status"] });
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const item = itemsOf(cast, 1)[0],
    thing = thingOf(cast);
  return {
    number: "1",
    to: (item && titleOf(item, 28, thing)) || placeholderTitle(0),
    date: "2026-11-18",
    lines: [{ item: (item && titleOf(item, 32, thing)) || placeholderTitle(0), qty: 1, price: 0 }],
    status: "draft",
  };
}
export const examples = [
  {
    number: "L-042",
    to: "Anna Patel",
    date: "2026-11-18",
    due: "2026-12-02",
    lines: [
      { item: "Plant care visit", qty: 2, price: 20 },
      { item: "Repotting", qty: 1, price: 30 },
    ],
    tax: 10,
    status: "sent",
    note: "Thank you for keeping things growing.",
    style: "invoice",
  },
  {
    number: "T-Q07",
    to: "Ben Carter",
    date: "2026-11-18",
    lines: [{ item: "Morning park walk", qty: 8, price: 15 }],
    status: "draft",
    style: "quote",
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Invoice");
export const probes = [
  choose(
    "Send a client a bill with its number, dates, quantities, unit prices and tax, or a quote they can accept",
  ),
  choose("Show one client's phone number and address as simple labelled details", "KeyValue"),
  write(
    "Draft invoice T-042 to Ben Carter dated 2026-11-18, due 2026-12-02, eight park walks at 15 each, tax ten percent",
  ),
  read("Send this bill to Anna", { address: "i1/send", action: "press" }),
  read("Decline this quote", { address: "i1/decline", action: "press" }, 1),
] satisfies Probe[];

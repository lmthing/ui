import { z } from "zod";
import * as c from "../../../catalog";

const modes = ["pickup", "delivery", "table"] as const;
const methods = ["card", "cash", "wallet"] as const;

// Core first: Field/choice can set one preference, not fulfillment and payment together before placing an order.
export const meta = {
  id: "Checkout",
  status: "draft",
  group: "input",
  purpose: "Choose fulfillment and payment, then place an order.",
  pick: "Finish a goods order by choosing pickup or delivery and a payment method, then place it. Not editing one field (Field), reviewing an appointment (Appointment), or editing basket items (Cart).",
  writeHints: [
    "Use unique modes and methods, and select a mode and method that appear in their lists. The total comes from the basket, not props.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  // Tiers are static per address; protect the shared submission address for card and wallet.
  partTiers: { place: "service" },
  realPath: "Cash on pickup works on the device; card and wallet payments need a payment service.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"] },
  parts: ["root", "mode", "method", "time", "address", "total", "place"],
  states: ["filled", "success"],
  actions: {
    parts: { mode: ["select"], method: ["select"], address: ["press"], place: ["press"] },
    when: { address: { mode: "delivery" } },
  },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    modes: z.array(z.enum(modes)).min(1).max(modes.length),
    mode: z.enum(modes),
    time: c.text(20).optional(),
    address: c.text(60).optional(),
    methods: z.array(z.enum(methods)).min(1).max(methods.length),
    method: z.enum(methods),
    ...c.variantProps(meta.variants),
  })
  .refine((p) => new Set(p.modes).size === p.modes.length && p.modes.includes(p.mode), { path: ["modes"] })
  .refine((p) => new Set(p.methods).size === p.methods.length && p.methods.includes(p.method), {
    path: ["methods"],
  });

export function fallback({ cast }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const item = c.itemsOf(cast, 1)[0];
  const address = item && c.detailOf(item, 60, thing);
  return {
    modes: ["pickup", "delivery"],
    mode: "pickup",
    methods: ["cash", "card"],
    method: "cash",
    ...(address ? { address } : {}),
  };
}

export const examples = [
  {
    modes: ["pickup", "delivery"],
    mode: "delivery",
    time: "Tomorrow 10:30",
    address: "21 Fern Lane",
    methods: ["card", "cash"],
    method: "card",
  },
  {
    modes: ["pickup", "table"],
    mode: "pickup",
    methods: ["wallet", "cash"],
    method: "cash",
    density: "compact",
    surface: "plain",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Checkout");
export const probes = [
  choose(
    "Finish my purchase: choose pickup or delivery, pick how to pay and place the order with the basket total",
  ),
  choose("Enter or edit one labelled street address in a single line on a form, no other fields", "Field"),
  write(
    "Finish an order with pickup or delivery, pickup selected tomorrow at 10:30, card or cash, cash selected.",
  ),
  read("Place the order now using the selected payment method", { address: "c1/place", action: "press" }),
] satisfies c.Probe[];

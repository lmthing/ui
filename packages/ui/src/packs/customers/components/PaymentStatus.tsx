import { z } from "zod";
import { isoDate, probesFor, text, type CastLike, type Meta, type Probe } from "../../../catalog";

// Core first: Amount/large cannot derive one client payment's settlement and expose mark/remind actions.
export const meta = {
  id: "PaymentStatus",
  status: "draft",
  group: "data",
  purpose: "Track whether one client payment arrived and mark it paid or remind them.",
  pick: "One payment from a client, with paid amount, dates, method and mark or remind actions. Not a full bill (Invoice) or the person's own balance (Amount).",
  writeHints: [
    "Write amount and optional paid amount, not a status or balance. Code derives paid, due, overdue or part paid from paid, amount and due.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A payment flag stored on the device; card payments need a payment service.",
  parts: ["root", "status", "amount", "paid", "date", "due", "method", "mark", "remind"],
  partTiers: { remind: "service" },
  states: ["filled", "success"],
  actions: { parts: { mark: ["press"], remind: ["press"] } },
} as const satisfies Meta;
export const props = z.strictObject({
  amount: z.number().min(0),
  paid: z.number().min(0).optional(),
  date: isoDate,
  due: isoDate.optional(),
  method: text(16).optional(),
});
export function fallback(_input: { cast: CastLike }): z.input<typeof props> {
  return { amount: 0, date: "2026-11-18" };
}
export const examples = [
  { amount: 60, paid: 20, date: "2026-11-18", due: "2026-12-02", method: "Bank transfer" },
  { amount: 120, paid: 120, date: "2026-11-17", method: "Cash" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("PaymentStatus");
export const probes = [
  choose("Track one client's payment, how much arrived, its due date and a button to mark paid or remind"),
  choose("Show my own current balance as one large money figure without payment tracking", "Amount"),
  write("Ben owes a payment of 120 dated 2026-11-18, paid 30 so far, due 2026-12-02 by bank transfer"),
  read("Mark this payment as paid", { address: "p1/mark", action: "press" }),
] satisfies Probe[];

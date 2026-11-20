import { z } from "zod";
import * as c from "../../../catalog";
import { seedTitles } from "../seeds";

// Core first: List/cards cannot compute outstanding costs or offer supplier-specific call controls.
const roles = ["venue", "food", "photo", "music", "flowers", "cake", "transport", "other"] as const;
export const meta = {
  id: "Vendors",
  status: "draft",
  group: "data",
  purpose: "Keep track of event suppliers, bookings, payments and what is still owed.",
  pick: "Suppliers for one event with roles, bookings, amounts agreed and paid, due dates and phone calls. Not a general directory (List), the business's own clients (ClientCard) or personal bills (Bills).",
  writeHints: ["Use numeric cost and paid without currency; paid cannot exceed cost. Do not write totals."],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Supplier records are stored on the device; calls use the supplier's phone number.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root", "totals"],
  items: { key: "vendors", parts: ["root", "role", "name", "cost", "paid", "due", "booked", "call"] },
  partTiers: { call: "service" },
  states: ["filled", "empty"],
  actions: { items: { root: ["press"], call: ["press"] }, when: { call: { canCall: true } } },
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { vendors } = input as z.output<typeof props>;
    const [cost, paid] = vendors.reduce(
      ([cost, paid], vendor) => [cost + vendor.cost, paid + vendor.paid],
      [0, 0],
    );
    return [
      [cost, paid, cost - paid].map((amount) => c.numberLine(amount, lang)).join(" / "),
      ...vendors.map(
        (vendor, index) =>
          `r${index + 1}: ${[
            vendor.role,
            c.numberLine(vendor.cost, lang),
            c.numberLine(vendor.paid, lang),
            vendor.due,
            vendor.booked,
          ]
            .filter((value) => value !== undefined)
            .join(" · ")}`,
      ),
    ];
  },
} as const satisfies c.Meta;

const vendor = z
  .strictObject({
    role: z.enum(roles),
    name: c.text(24),
    cost: z.number().nonnegative(),
    paid: z.number().nonnegative(),
    due: c.isoDate.optional(),
    booked: z.boolean(),
    phone: c.text(20).optional(),
  })
  .refine(({ cost, paid }) => paid <= cost, { path: ["paid"], message: "Paid cannot exceed cost" });

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    vendors: z.array(vendor).min(1).max(6),
  })
  .overwrite((input) => ({
    ...input,
    vendors: input.vendors.map((vendor) => ({ ...vendor, canCall: vendor.phone !== undefined })),
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    vendors: seedTitles(input, 24, 3).map((name) => ({
      name,
      role: "other",
      cost: 0,
      paid: 0,
      booked: false,
    })),
  };
}

export const examples = [
  {
    vendors: [
      {
        role: "food",
        name: "Juniper Kitchen",
        cost: 2400,
        paid: 1200,
        due: "2027-05-30",
        booked: true,
        phone: "01632 960123",
      },
      { role: "music", name: "The May Quartet", cost: 900, paid: 0, booked: false },
    ],
  },
  {
    density: "compact",
    surface: "outlined",
    vendors: [{ role: "venue", name: "Harbour Hall", cost: 1500, paid: 1500, booked: true }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Vendors");
export const probes = [
  choose(
    "For my wedding keep track of each supplier, whether they're booked, the agreed cost, what's been paid, and the due date for the balance.",
  ),
  choose(
    "List several venues to browse, each with a short description and a link to its own details. No supplier payments or bookings.",
    "List",
  ),
  write(
    "Add Juniper Kitchen, a booked caterer, agreed cost 2400 with 1200 paid, balance due 2027-05-30, phone 01632 960123.",
  ),
  read("Call Juniper Kitchen.", { address: "v1/r1/call", action: "press" }),
] satisfies c.Probe[];

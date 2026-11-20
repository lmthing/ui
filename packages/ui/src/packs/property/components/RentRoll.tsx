import { z } from "zod";
import * as c from "../../../catalog";
import { distinct, ref, seedDate, seedLabels } from "../seeds";

// Core first: Amount/total cannot reconcile rent charges and allocated receipts across units or periods.
export const meta = {
  id: "RentRoll",
  status: "draft",
  group: "data",
  purpose: "Reconcile monthly rent charges and receipts across units, including part payments and arrears.",
  pick: "Reconcile rent charges and allocated or voided receipts by unit and period. Not one sum (Amount), one client's payment (PaymentStatus), an invoice (Invoice), or personal bills (Bills).",
  writeHints: [
    "Every receipt references a charge in this line; keep older charges when needed for arrears. Seed obligations and allocations only, not computed receipt totals, outstanding, arrears, credit or statuses.",
    'Give each charge and each receipt its own snake_case reference. Charges and receipts use positive numbers, not currency text. Use style "outstanding" only to filter unpaid units.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "A local rent ledger uses messaging for reminders, and recording a payment never moves money.",
  variants: { density: ["comfortable", "compact"], figures: ["exact", "short"] },
  parts: ["root", "month", "assessed", "received", "outstanding", "arrears"],
  items: {
    key: "lines",
    // prettier-ignore
    parts: [
      "root", "unit", "occupant", "due", "amount", "paid", "outstanding", "credit",
      "date", "method", "voided", "record", "remind", "void",
    ],
  },
  partTiers: { remind: "service" },
  confirmParts: ["void"],
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    items: { record: ["press"], remind: ["press"], void: ["press"] },
    when: {
      record: { kind: "charge", visible: true },
      remind: { unpaid: true, visible: true },
      void: { kind: "receipt", voided: false, visible: true },
    },
  },
  read: (input, _state, lang): string[] => {
    const { lines, totals, figures } = input as Ledger & ReturnType<typeof ledgerRows>;
    const money = (amount: number) =>
      figures === "short"
        ? c.compactMoneyLine(amount, undefined, lang)
        : c.moneyLine(amount, undefined, undefined, lang);
    return [
      `${totals.month} · assessed ${money(totals.assessed)} · received ${money(totals.received)} · outstanding ${money(totals.outstanding)} · arrears ${money(totals.arrears)}`,
      ...lines.flatMap((line, index) =>
        !line.visible
          ? []
          : line.kind === "receipt"
            ? [
                `r${index + 1} ${line.unit} · ${line.date} · ${money(line.amount)} ${line.method}${line.voided ? " · voided" : ""}`,
              ]
            : [
                `r${index + 1} ${line.unit} · ${line.occupant} · ${line.due} · ${money(line.amount)} assessed · ${money(line.paid)} received · ${money(line.outstanding)} outstanding${line.credit ? ` · ${money(line.credit)} credit` : ""}`,
              ],
      ),
    ];
  },
} as const satisfies c.Meta;

const charge = z.strictObject({
  chargeRef: ref,
  letRef: ref,
  unitRef: ref,
  unit: c.text(32),
  occupant: c.text(24),
  due: c.isoDate,
  amount: z.number().positive(),
});
const receipt = z.strictObject({
  receiptRef: ref,
  chargeRef: ref,
  date: c.isoDate,
  amount: z.number().positive(),
  method: z.enum(["cash", "transfer", "card"]),
  voided: z.boolean().default(false),
});
const schema = z.strictObject({
  ...c.variantProps(meta.variants),
  month: z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/),
  charges: z.array(charge).min(1).max(24),
  receipts: z.array(receipt).min(0).max(48),
  style: z.enum(["ledger", "outstanding"]).default("ledger"),
});

type Ledger = z.output<typeof schema>;
function ledgerRows(value: Ledger, today: string) {
  const charges = value.charges.map((charge) => {
    const paid = value.receipts.reduce(
      (total, receipt) =>
        receipt.chargeRef === charge.chargeRef && !receipt.voided ? total + receipt.amount : total,
      0,
    );
    return {
      ...charge,
      kind: "charge" as const,
      paid,
      outstanding: Math.max(0, charge.amount - paid),
      credit: Math.max(0, paid - charge.amount),
      unpaid: charge.amount > paid,
    };
  });
  const visibleUnits = new Set(charges.filter((charge) => charge.unpaid).map((charge) => charge.unitRef));
  const visible = (unitRef: string) => value.style === "ledger" || visibleUnits.has(unitRef);
  const lines = [
    ...charges.map((charge) => ({ ...charge, visible: visible(charge.unitRef) })),
    ...value.receipts.flatMap((receipt) => {
      const charge = charges.find(({ chargeRef }) => receipt.chargeRef === chargeRef);
      return charge
        ? [{ ...receipt, unit: charge.unit, kind: "receipt" as const, visible: visible(charge.unitRef) }]
        : [];
    }),
  ];
  const totals = { month: value.month, assessed: 0, received: 0, outstanding: 0, arrears: 0 };
  for (const charge of charges) {
    const month = charge.due.slice(0, 7);
    if (month === value.month) {
      totals.assessed += charge.amount;
      totals.received += charge.paid;
      totals.outstanding += charge.outstanding;
    }
    if (month <= value.month && charge.due < today) totals.arrears += charge.outstanding;
  }
  return { lines, totals };
}

function localToday(now: Date) {
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part, index) => String(part).padStart(index ? 2 : 4, "0"))
    .join("-");
}

export const props = schema
  .refine(({ charges }) => distinct(charges, ({ chargeRef }) => chargeRef), { path: ["charges"] })
  .refine(
    ({ charges, receipts }) =>
      distinct(receipts, ({ receiptRef }) => receiptRef) &&
      receipts.every((receipt) => charges.some((charge) => charge.chargeRef === receipt.chargeRef)),
    { path: ["receipts"] },
  )
  .overwrite((value) => ({ ...value, ...ledgerRows(value, localToday(new Date())) }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    month: seedDate.slice(0, 7),
    charges: seedLabels(input).map(({ ref, title, short }) => ({
      chargeRef: `${ref}_charge`,
      letRef: `${ref}_let`,
      unitRef: ref,
      unit: title,
      occupant: short,
      due: seedDate,
      amount: 1,
    })),
    receipts: [],
  };
}

// prettier-ignore
export const examples = [
  {
    month: "2026-11",
    charges: [{ chargeRef: "nov_willow", letRef: "asha_let", unitRef: "flat_a", unit: "Willow Flat", occupant: "Asha", due: "2026-11-01", amount: 900 }],
    receipts: [{ receiptRef: "nov_willow_one", chargeRef: "nov_willow", date: "2026-11-05", amount: 600, method: "transfer" }],
  },
  {
    month: "2026-10", style: "outstanding", density: "compact", figures: "short",
    charges: [{ chargeRef: "oct_cedar", letRef: "lee_let", unitRef: "flat_b", unit: "Cedar Flat", occupant: "Lee", due: "2026-10-01", amount: 11000 }],
    receipts: [{ receiptRef: "oct_cedar_one", chargeRef: "oct_cedar", date: "2026-10-02", amount: 500, method: "cash", voided: true }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("RentRoll");
export const probes = [
  choose(
    "Reconcile this month's rent across my flats with separate dated charges, partial receipts and older arrears",
  ),
  choose("Show one amount, 900 per month, with no ledger, payments or balance", "Amount"),
  write(
    "For 2026-11, charge nov_willow: Willow Flat (flat_a), Asha (asha_let), due 2026-11-01, amount 900. Allocate transfer receipt nov_willow_one for 600 on 2026-11-05 to it.",
  ),
  {
    ...write(
      "For 2026-10, show charge oct_cedar of 11000 due 2026-10-01 for Lee (lee_let) in Cedar Flat (flat_b). No receipts. Abbreviate large figures rather than showing all digits.",
    ),
    variant: { axis: "figures", value: "short" },
  },
  read("Void the recorded 600 transfer for Willow Flat", { address: "r1/r2/void", action: "press" }),
] satisfies c.Probe[];

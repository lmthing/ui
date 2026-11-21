import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Field/number edits one value, not a routed payment with funding, fees and confirmation.
export const meta = {
  id: "MoneyTransfer",
  status: "draft",
  group: "action",
  purpose: "Send money to or request money from someone, with the cost shown before confirmation.",
  pick: "Send or request money with a named recipient, funding account and speed, or show a personal payment QR. Not entering a local expense (AmountPad, Field), settling group costs (Split), or paying a business invoice (PaymentStatus).",
  region: "body",
  weight: 2,
  tier: "service",
  realPath:
    "A payment service executes transfers; scanning needs camera permission and requests reach another person.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["memo"] } },
  parts: [
    "root",
    "mode",
    "tab",
    "recipient",
    "photo",
    "handle",
    "source",
    "label",
    "value",
    "pad",
    "memo",
    "speed",
    "fee",
    "total",
    "submit",
    "submit_label",
    "code",
    "scan",
    "scan_label",
    "status",
  ],
  states: ["filled", "empty", "loading", "success", "error"],
  partTiers: { scan: "ok" },
  partTiersBy: { submit: { prop: "mode", tiers: { request: "people" } } },
  confirmParts: ["submit"],
  actions: {
    parts: {
      mode: ["select"],
      tab: ["select"],
      source: ["select"],
      pad: ["type"],
      memo: ["type"],
      speed: ["select"],
      submit: ["press"],
      scan: ["scan"],
    },
    when: {
      source: { style: "transfer" },
      pad: { style: "transfer" },
      memo: { style: "transfer", detail: "full" },
      speed: { style: "transfer", mode: "send" },
      submit: { style: "transfer", ready: true },
      scan: { style: "qr" },
    },
  },
} as const satisfies c.Meta;

const source = z.strictObject({
  label: c.text(24),
  last4: c
    .text(4)
    .regex(/^\d{4}$/)
    .optional(),
  balance: z.number().optional(),
});

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    mode: z.enum(["send", "request"]).default("send"),
    recipient: z.strictObject({ name: c.text(24), handle: c.text(32).optional(), photo: c.photo.optional() }),
    sources: z.array(source).min(1).max(4),
    sourceAt: z.number().int().min(0).max(3).default(0),
    amount: z.number().positive().optional(),
    memo: c.text(60).optional(),
    speed: z.enum(["standard", "instant"]).default("standard"),
    instantFee: z.number().nonnegative().optional(),
    qrPayload: c.text(120).optional(),
    style: z.enum(["transfer", "qr"]).default("transfer"),
  })
  .refine(({ sourceAt, sources }) => sourceAt < sources.length, {
    path: ["sourceAt"],
    message: "Select one of the supplied sources",
  });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const [person, account] = c.itemsOf(cast, 2);
  const thing = c.thingOf(cast);
  return {
    recipient: { name: (person && c.titleOf(person, 24, thing)) || c.placeholderTitle(0, lang) },
    sources: [{ label: (account && c.titleOf(account, 24, thing)) || c.placeholderLabel(lang) }],
  };
}

export const examples = [
  {
    recipient: { name: "Mina Park", handle: "@mina", photo: "lib:people" },
    sources: [
      { label: "Everyday", last4: "4821", balance: 420 },
      { label: "Garden fund", balance: 70 },
    ],
    amount: 24.5,
    memo: "Ledge seed trays",
    speed: "instant",
    instantFee: 0.5,
  },
  {
    mode: "request",
    recipient: { name: "Alex Reed", handle: "@alex" },
    sources: [{ label: "Trot walking fund" }],
    style: "qr",
    qrPayload: "demo:trot:alex",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("MoneyTransfer");
export const probes = [
  choose(
    "Pay a friend from one of my bank accounts, showing the instant fee and confirming the transfer before sending.",
  ),
  choose(
    "Add one small number input for an estimated cost among several form fields. No payment or keypad.",
    "Field",
  ),
  write(
    "Send Mina Park 24.50 for seed trays from Everyday ending 4821; use instant delivery with a fee of 0.50.",
  ),
  {
    ...write(
      "Send Mina Park 24.50 from Everyday, standard speed. Show the transfer form without the memo field.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Start confirming payment to Mina Park.", { address: "m1/submit", action: "press" }),
] satisfies c.Probe[];

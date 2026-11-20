import { z } from "zod";
import * as c from "../../../catalog";
import { payPeriods, seedApplicationId, seedDate, seedGoto, seedRows } from "../seeds";

// Core first: Amount/inline shows one pay number but cannot hold employment terms or their response.
export const meta = {
  id: "Offer",
  status: "draft",
  group: "content",
  purpose: "Review proposed employment terms and manage the offer and its response.",
  pick: "An employment offer with pay, hours, start date, conditions, response deadline and status. Not pay alone (Amount), a discount (Promo), a client agreement (Agreement) or a quote (Invoice).",
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { send: "service", accept: "people", decline: "people", withdraw: "service" },
  realPath:
    "The phone holds drafts and logged outcomes, sending needs an outside service, and actual responses need a shared app.",
  variants: { density: ["comfortable", "compact"] },
  parts: [
    "root",
    "candidate",
    "role",
    "employer",
    "pay",
    "hours_per_week",
    "start",
    "respond_by",
    "conditions",
    "status",
    "edit",
    "send",
    "accept",
    "decline",
    "withdraw",
  ],
  confirmParts: ["decline", "withdraw"],
  states: ["filled", "loading", "success", "error"],
  actions: {
    parts: { edit: ["press"], send: ["send"], accept: ["press"], decline: ["press"], withdraw: ["press"] },
    when: {
      edit: { status: "draft" },
      send: { status: "draft" },
      accept: { status: "sent" },
      decline: { status: "sent" },
      withdraw: { status: "sent" },
    },
    noGoto: { parts: ["accept", "decline", "withdraw"] },
  },
  writeHints: [
    "Write numeric pay in the brief's currency, not currency text. Record only a supplied response status; acceptance does not mean hired. Do not write a calculated expiry flag.",
  ],
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  offerId: c.text(32),
  applicationId: c.text(32),
  candidate: c.text(24),
  role: c.text(32),
  employer: c.text(32),
  pay: z.number().min(0),
  per: z.enum(payPeriods),
  hoursPerWeek: z.number().gt(0).max(80),
  start: c.isoDate,
  respondBy: c.isoDate.optional(),
  conditions: z.array(c.text(100)).min(0).max(6),
  status: z.enum(["draft", "sent", "accepted", "declined", "withdrawn"]),
  goto: c.screenId,
  style: z.enum(["letter", "card"]).default("letter"),
});

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const [row] = seedRows(input, 1);
  return {
    offerId: "offer_1",
    applicationId: seedApplicationId,
    candidate: row!.title(24),
    role: row!.detail(32),
    employer: c.clip(c.placeholderTitle(1, input.lang), 32),
    pay: 0,
    per: "hour",
    hoursPerWeek: 1,
    start: seedDate,
    conditions: [],
    status: "draft",
    goto: seedGoto,
  };
}

export const examples: z.input<typeof props>[] = [
  {
    offerId: "sam_terms",
    applicationId: "sam",
    candidate: "Sam Patel",
    role: "Summer dog walker",
    employer: "Trot",
    pay: 20,
    per: "hour",
    hoursPerWeek: 20,
    start: "2027-05-10",
    respondBy: "2027-05-01",
    conditions: ["Subject to two references"],
    status: "sent",
    goto: "offer_edit",
  },
  {
    offerId: "mara_terms",
    applicationId: "mara",
    candidate: "Mara Kim",
    role: "Morning baker",
    employer: "Harbour Bakery",
    pay: 26,
    per: "hour",
    hoursPerWeek: 30,
    start: "2027-06-07",
    conditions: [],
    status: "draft",
    goto: "mara_edit",
    style: "card",
    density: "compact",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Offer");
export const probes: c.Probe[] = [
  choose(
    "Show a proposed job offer with hourly pay, weekly hours, a start date and conditions, and let the recipient accept or decline.",
  ),
  choose(
    "Show just one prominent money figure for the hourly rate, labelled Base pay. No other employment terms, deadlines or actions.",
    "Amount",
  ),
  write(
    "Trot sent Sam Patel a Summer dog walker offer: 20 per hour, 20 hours weekly, start 2027-05-10, reply by 2027-05-01, subject to two references. Link to the edit form.",
  ),
  read("Withdraw the offer that was sent to Sam.", { address: "o1/withdraw", action: "press" }),
] satisfies c.Probe[];

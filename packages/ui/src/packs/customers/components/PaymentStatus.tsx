import { useWords, KitAction, KitCard, KitContent, KitText, useComponentState } from "../../../kit";
import { customersWordsFor } from "../lang";
import { z } from "zod";
import { isoDate, probesFor, text, type CastLike, type Meta, type Probe, type Props } from "../../../catalog";
import { paymentAmountLine, paymentDetails, paymentFallback, paymentReading, paymentStatus } from "../copy";

// Core first: Amount/large cannot derive one client payment's settlement and expose mark/remind actions.
export const meta = {
  id: "PaymentStatus",
  status: "ready",
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
  parts: ["root", "status", "amount", "paid", "date", "due", "method", "mark", "remind", "confirmation"],
  partTiers: { remind: "service" },
  states: ["filled", "success"],
  actions: {
    parts: { mark: ["press"], remind: ["press"] },
    when: { mark: { outstanding: true }, remind: { outstanding: true } },
  },
  read: (input, _state, lang?: string) => paymentReading(input as z.output<typeof props>, lang),
} as const satisfies Meta;
export const props = z
  .strictObject({
    amount: z.number().min(0),
    paid: z.number().min(0).optional(),
    date: isoDate,
    due: isoDate.optional(),
    method: text(16).optional(),
  })
  // Code-owned action presence, never a Writer-supplied status or balance.
  .overwrite((value) => ({ ...value, outstanding: (value.paid ?? 0) < value.amount }));
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  return paymentFallback(cast);
}
export const examples = [
  { amount: 60, paid: 20, date: "2026-11-18", due: "2026-12-02", method: "Bank transfer" },
  { amount: 120, paid: 120, date: "2026-11-17", method: "Cash" },
  { amount: 40, date: "2026-11-01", due: "2026-11-10" },
  { amount: 25, paid: 0, date: "2026-11-18", due: "2026-12-02" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("PaymentStatus");
export const probes = [
  choose("Track one client's payment, how much arrived, its due date and a button to mark paid or remind"),
  choose("Show my own current balance as one large money figure without payment tracking", "Amount"),
  write("Ben owes 120 for dog walks dated 2026-11-18, paid 30 so far, due 2026-12-02 by bank transfer"),
  read("Mark this payment as paid", { address: "p1/mark", action: "press" }),
  read("Send a reminder for this payment", { address: "p1/remind", action: "press" }),
] satisfies Probe[];

export function PaymentStatus(input: Props<typeof props, typeof meta>) {
  const { lang, words } = useWords(customersWordsFor);
  const { paymentLabels } = words;
  const state = useComponentState();
  const status = paymentStatus(input);
  const tone = status === "paid" ? "good" : status === "overdue" ? "bad" : "warn";
  return (
    <KitCard padded part="root">
      <KitContent lineRole="title">
        <KitText role="title" tone={tone} part="status">
          {paymentLabels[status]}
        </KitText>
        <KitText role="number" numberScale="compact" tabular part="amount">
          {paymentAmountLine(input.amount, lang)}
        </KitText>
      </KitContent>
      <KitContent>
        {paymentDetails(input, lang).map(({ part, text }) => (
          <KitText key={part} role="label" tone="muted" tabular={part !== "method"} part={part}>
            {text}
          </KitText>
        ))}
      </KitContent>
      {state === "success" ? (
        <KitText role="label" tone="good" part="confirmation">
          {paymentLabels.updated}
        </KitText>
      ) : (input.paid ?? 0) < input.amount ? (
        <>
          <KitAction label={paymentLabels.mark} part="mark" disabled={state !== "filled"} full />
          <KitAction
            label={paymentLabels.remind}
            kind="quiet"
            part="remind"
            disabled={state !== "filled"}
            full
          />
        </>
      ) : null}
    </KitCard>
  );
}

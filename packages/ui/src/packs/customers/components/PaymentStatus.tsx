import {
  useWords,
  KitAction,
  KitCard,
  KitContent,
  KitText,
  useComponentState,
  useVariant,
} from "../../../kit";
import { customersWordsFor } from "../lang";
import { z } from "zod";
import {
  isoDate,
  probesFor,
  text,
  variantProps,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
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
    'If asked only to hide the payment method, use {"density":null,"surface":null,"detail":"brief"} and keep the method in the data. Otherwise detail is null.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A payment flag stored on the device; card payments need a payment service.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["method"] } },
  parts: ["root", "status", "amount", "paid", "date", "due", "method", "mark", "remind", "confirmation"],
  partTiers: { remind: "service" },
  states: ["filled", "success"],
  actions: {
    parts: { mark: ["press"], remind: ["press"] },
    when: { mark: { outstanding: true }, remind: { outstanding: true } },
  },
  read: (input, _state, lang?: string): string[] => paymentReading(input as z.output<typeof props>, lang),
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    amount: z.number().min(0),
    paid: z.number().min(0).optional(),
    date: isoDate,
    due: isoDate.optional(),
    method: text(16).optional(),
  })
  // Code-owned action presence, never a Writer-supplied status or balance.
  .overwrite((value) => ({
    ...value,
    ...(value.detail === "brief" ? { method: undefined } : {}),
    outstanding: (value.paid ?? 0) < value.amount,
  }));
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  return paymentFallback(cast);
}
const variantExample = {
  amount: 25,
  paid: 0,
  date: "2026-11-18",
  due: "2026-12-02",
  method: "Cash",
} satisfies z.input<typeof props>;
export const examples = [
  { amount: 60, paid: 20, date: "2026-11-18", due: "2026-12-02", method: "Bank transfer" },
  { amount: 120, paid: 120, date: "2026-11-17", method: "Cash" },
  { amount: 40, date: "2026-11-01", due: "2026-11-10" },
  { ...variantExample, density: "compact" },
  { ...variantExample, surface: "outlined" },
  { ...variantExample, detail: "brief" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("PaymentStatus");
export const probes = [
  choose("Track one client's payment, how much arrived, its due date and a button to mark paid or remind"),
  choose("Show my own current balance as one large money figure without payment tracking", "Amount"),
  write("Ben owes 120 for dog walks dated 2026-11-18, paid 30 so far, due 2026-12-02 by bank transfer"),
  {
    ...write(
      "Track Ben's payment of 30 out of 120 for walks dated 2026-11-18, due 2026-12-02. Save Bank transfer as the method but hide the method on the card.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Mark this payment as paid", { address: "p1/mark", action: "press" }),
  read("Send a reminder for this payment", { address: "p1/remind", action: "press" }),
] satisfies Probe[];

export function PaymentStatus(input: Props<typeof props, typeof meta>) {
  const { lang, words } = useWords(customersWordsFor);
  const { paymentLabels } = words;
  const { surface } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const state = useComponentState();
  const status = paymentStatus(input);
  const tone = status === "paid" ? "good" : status === "overdue" ? "bad" : "warn";
  return (
    <KitCard padded part="root" {...{ density, surface }}>
      <KitContent lineRole="title" {...{ density }}>
        <KitText role="title" tone={tone} part="status" {...{ density }}>
          {paymentLabels[status]}
        </KitText>
        <KitText role="number" numberScale="compact" tabular part="amount" {...{ density }}>
          {paymentAmountLine(input.amount, lang)}
        </KitText>
      </KitContent>
      <KitContent {...{ density }}>
        {paymentDetails(input, lang).map(({ part, text }) => (
          <KitText
            key={part}
            role="label"
            tone="muted"
            tabular={part !== "method"}
            part={part}
            {...{ density }}
          >
            {text}
          </KitText>
        ))}
      </KitContent>
      {state === "success" ? (
        <KitText role="label" tone="good" part="confirmation" {...{ density }}>
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

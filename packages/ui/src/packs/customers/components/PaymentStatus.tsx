// prettier-ignore
import { useWords, KitAction, KitActionFooter, KitCard, KitCode, KitContent, KitFigure, KitGrid, KitHeader, KitLayoutText, KitRow, KitRowGroup, KitState, useComponentState, useVariant } from "../../../kit";
import { customersWordsFor } from "../lang";
import { z } from "zod";
// prettier-ignore
import { compactMoneyLine, isoDate, probesFor, text, variantProps, type CastLike, type Meta, type Probe, type Props } from "../../../catalog";
// prettier-ignore
import { installmentLine, installmentTotal, paymentDetails, paymentFallback, paymentPaid, paymentReading, paymentStatus } from "../copy";

export const meta = {
  id: "PaymentStatus",
  status: "ready",
  group: "data",
  purpose: "Track whether one client payment arrived and mark it paid or remind them.",
  pick: "One payment from a client, with paid amount, dates, method and mark or remind actions. Not a full bill (Invoice) or the person's own balance (Amount).",
  writeHints: [
    "Write amount and optional paid amount, not a status or balance. Code derives paid, due, overdue or part paid from paid, amount and due.",
    'If asked only to hide the payment method, use {"density":null,"surface":null,"detail":"brief"} and keep the method in the data. Otherwise detail is null.',
    'Use style "link" only with a supplied HTTPS paymentLink; never invent a link. For received installments, write their date and amount in installments. If paid is supplied, it is the full amount received and already includes these rows; otherwise code sums the rows.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A payment flag stored on the device; card payments need a payment service.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["method"] } },
  // prettier-ignore
  parts: ["root", "status", "amount", "paid", "date", "due", "method", "mark", "remind", "confirmation",
    "code", "copy", "share", "installments"],
  items: { key: "installments", parts: ["root", "date", "amount"] },
  partTiers: { remind: "service", copy: "service", share: "service" },
  states: ["filled", "success"],
  emptyActions: [], // Use the displayed state when planning detached actions.
  actions: {
    parts: { mark: ["press"], remind: ["press"], copy: ["copy"], share: ["press"] },
    // prettier-ignore
    when: { mark: { outstanding: true }, remind: { outstanding: true }, copy: { showLink: true }, share: { showLink: true } },
  },
  read: (input, _state, lang?: string): string[] => paymentReading(input as z.output<typeof props>, lang),
} as const satisfies Meta;
// prettier-ignore
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    amount: z.number().min(0),
    paid: z.number().min(0).optional(),
    date: isoDate,
    due: isoDate.optional(),
    method: text(16).optional(),
    style: z.enum(["status", "link"]).optional(),
    paymentLink: text(180)
      .refine((link) => {
        try {
          const url = new URL(link);
          return /^https:\/\/[^/\s\\][^\s\\]*$/i.test(link) && !/[\uD800-\uDFFF]/u.test(link)
            && !!url.hostname && !url.username && !url.password;
        } catch {
          return false;
        }
      })
      .meta({ kind: "secret", max: 180 })
      .optional(),
    installments: z.array(z.strictObject({ date: isoDate, amount: z.number().positive().multipleOf(0.01) })).min(1).max(6).optional(),
  })
  .refine((value) => (value.style === "link") === (value.paymentLink !== undefined), { path: ["paymentLink"] })
  .refine(({ installments, paid }) => {
    const total = installmentTotal(installments);
    return total === undefined || (Number.isFinite(total) && (paid === undefined || paid >= total));
  }, { path: ["installments"] })
  // Code-owned action presence, never a Writer-supplied status or balance.
  .overwrite((value) => {
    const outstanding = (paymentPaid(value) ?? 0) < value.amount;
    return {
      ...value,
      ...(value.detail === "brief" ? { method: undefined } : {}),
      outstanding,
      ...(value.style === "link" ? { showLink: outstanding } : {}),
    };
  });
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  return paymentFallback(cast);
}
// prettier-ignore
const variantExample = { amount: 25, paid: 0, date: "2026-11-18", due: "2026-12-02", method: "Cash" } satisfies z.input<typeof props>;
const exampleLink = "https://example.com/pay/trot";
const exampleInstallments = [
  { date: "2026-11-17", amount: 10 },
  { date: "2026-11-18", amount: 15 },
];
export const examples = [
  { amount: 60, paid: 20, date: "2026-11-18", due: "2026-12-02", method: "Bank transfer" },
  { amount: 120, paid: 120, date: "2026-11-17", method: "Cash" },
  { amount: 40, date: "2026-11-01", due: "2026-11-10" },
  { ...variantExample, density: "compact" },
  { ...variantExample, surface: "outlined" },
  { ...variantExample, detail: "brief" },
  { amount: 60, date: "2026-11-18", style: "link", paymentLink: exampleLink },
  { amount: 60, date: "2026-11-18", installments: exampleInstallments },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("PaymentStatus");
// prettier-ignore
export const probes = [
  choose("Track one client's payment, how much arrived, its due date and a button to mark paid or remind"),
  choose("Show my own current balance as one large money figure without payment tracking", "Amount"),
  write("Ben owes 120 for dog walks dated 2026-11-18, paid 30 so far, due 2026-12-02 by bank transfer"),
  {
    ...write(
      "Track Ben's payment of 30 out of 120 for walks dated 2026-11-18, due 2026-12-02. Record Bank transfer as the payment method but don't show the method anywhere.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Mark this payment as paid", { address: "p1/mark", action: "press" }),
  read("Send a reminder for this payment", { address: "p1/remind", action: "press" }),
  { ...write(`Collect a client's payment of 60 dated 2026-11-18. Show the QR code and copy and share controls for this supplied payment link: ${exampleLink}`),
    expectProps: { style: "link", paymentLink: exampleLink } },
  { ...write("A client owes 60 on a payment record dated 2026-11-18. Show two received installments in its history: 10 on 2026-11-17 and 15 on 2026-11-18."),
    expectProps: { installments: exampleInstallments } },
] satisfies Probe[];

type PaymentProps = Props<typeof props, typeof meta>;
// prettier-ignore
function PaymentFacts({ input, density, lang }: { input: PaymentProps; density: PaymentProps["density"]; lang: string }) {
  const details = paymentDetails(input, lang);
  const rows = [
    details.filter(({ part }) => part === "date" || part === "due"),
    details.filter(({ part }) => part === "paid" || part === "method"),
  ];
  return (
    <KitContent {...{ density }}>
      {rows.map((row) => {
        const fields = row.map(({ part, text }) => <KitLayoutText key={part}
          line={{ text, part, role: "meta", tone: "muted", tabular: part !== "method" }} {...{ density }} />);
        return fields.length > 1 ? <KitGrid key={row[0]!.part} fitLast {...{ density }}>{fields}</KitGrid> : fields;
      })}
    </KitContent>
  );
}

// prettier-ignore
function Installments({ installments, density }: Pick<PaymentProps, "installments" | "density">) {
  const { lang, words } = useWords(customersWordsFor);
  if (!installments?.length) return null;
  return <KitContent {...{ density }}>
    <KitLayoutText line={{ text: words.paymentLabels.installments, part: "installments", strong: true }} {...{ density }} />
    <KitRowGroup {...{ density }}>{installments.map((row) => {
      const { date, amount } = installmentLine(row, lang);
      return <KitRow key={row.id} item={row.id} inline inset="none" label={date} {...{ density }}
        trailing={<KitLayoutText line={{ text: amount, part: "amount", role: "meta", tabular: true }} align="end" {...{ density }} />}>
        <KitLayoutText line={{ text: date, part: "date", role: "meta" }} {...{ density }} />
      </KitRow>;
    })}</KitRowGroup>
  </KitContent>;
}

// prettier-ignore
function PaymentLink({ link, density }: { link: string; density: PaymentProps["density"] }) {
  const { words } = useWords(customersWordsFor);
  const { copied } = useWords().words.codeLabels;
  const { copy, share, link: label } = words.paymentLabels;
  return (
    <KitContent {...{ density }}>
      <KitFigure media={<KitCode part="code" value={link} label={label} />} {...{ density }}
        caption={<KitLayoutText line={{ text: label, role: "meta" }} align="center" {...{ density }} />} />
      <KitActionFooter {...{ density }}><KitGrid {...{ density }}>
        <KitAction label={copy} part="copy" action="copy" value={link} copiedLabel={copied} kind="secondary" full />
        <KitAction label={share} part="share" kind="secondary" full />
      </KitGrid></KitActionFooter>
    </KitContent>
  );
}

// prettier-ignore
export function PaymentStatus(input: PaymentProps) {
  const { lang, words: { paymentLabels } } = useWords(customersWordsFor);
  const { words: { moneyLabels } } = useWords();
  const { surface, installments, paymentLink } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const state = useComponentState();
  const status = paymentStatus(input);
  const tone = status === "paid" ? "good" : status === "overdue" ? "bad" : "warn";
  return (
    <KitCard padded part="root" {...{ density, surface }}>
      <KitContent lineRole="title" {...{ density }}>
        <KitHeader title={{ text: paymentLabels[status], part: "status", tone }} {...{ density }} />
        <KitFigure value={{ text: compactMoneyLine(input.amount, undefined, lang), part: "amount" }}
          unit={{ text: moneyLabels.total, role: "meta" }} {...{ density }} />
      </KitContent>
      <PaymentFacts {...{ input, density, lang }} />
      <Installments {...{ installments, density }} />
      {state === "filled" && status !== "paid" && <>
        {paymentLink && <PaymentLink link={paymentLink} {...{ density }} />}
        <KitActionFooter {...{ density }}><KitGrid {...{ density }}>
          <KitAction label={paymentLabels.mark} part="mark" full />
          <KitAction label={paymentLabels.remind} kind="quiet" part="remind" full />
        </KitGrid></KitActionFooter>
      </>}
      {state === "success" && <KitState retain message={paymentLabels.updated} part="confirmation" {...{ density }} />}
    </KitCard>
  );
}

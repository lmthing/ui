// prettier-ignore
import { useWords, KitAction, KitCard, KitContent, KitGrid, KitRow, KitText, useComponentState, useVariant } from "../../../kit";
import { z } from "zod";
// prettier-ignore
import { isoDate, documentCopy, documentReading, itemsOf, moneyLine, placeholderTitle, probesFor, quantityLine, text, thingOf, titleOf, variantProps, type FallbackInput, type Meta, type Probe, type Props } from "../../../catalog";
// Core first: KeyValue/rows cannot show quantity-price lines, computed tax totals and bill/quote actions.
export const meta = {
  id: "Invoice",
  status: "ready",
  group: "content",
  purpose: "Bill a client or quote work before they accept it.",
  pick: "A business's bill or quote to a client, with quantity-price lines, tax and sending. Not plain details (KeyValue), personal bills to pay (Bills), or a shop order (OrderSummary).",
  writeHints: [
    "Write only line quantities and unit prices plus optional tax percent; code computes subtotal, tax, total and overdue.",
    'style: "quote" cannot have status: "paid". Use draft or sent for quotes.',
    'Hiding the note changes only detail: {"density":null,"surface":null,"detail":"brief"}. Keep the note in the data. Never emit "card" or "comfortable" just to indicate the default.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "A document made on the device; sending it needs email or SMS.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["note"] } },
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
  read: (input, state, lang?: string): string[] =>
    documentReading(input as z.infer<typeof props>, state, lang),
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
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
  .refine(({ status, style }) => style !== "quote" || status !== "paid", { path: ["status"] })
  .overwrite((value) => (value.detail === "brief" ? { ...value, note: undefined } : value));
const draft = "draft" as const;
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const item = itemsOf(cast, 1)[0],
    thing = thingOf(cast);
  return {
    number: "1",
    to: (item && titleOf(item, 28, thing)) || placeholderTitle(0, lang),
    date: "2026-11-18",
    lines: [{ item: (item && titleOf(item, 32, thing)) || placeholderTitle(0, lang), qty: 1, price: 0 }],
    status: draft,
  };
}
// prettier-ignore
const variantExample = {
  number: "T-043", to: "Ben Carter", date: "2026-11-19", due: "2026-12-03", status: draft,
  lines: [{ item: "Afternoon river walks", qty: 6, price: 18 }],
  note: "Thank you for booking with Trot.",
} satisfies z.input<typeof props>;
// prettier-ignore
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
    status: "sent",
    style: "quote",
  },
  variantExample,
  { ...variantExample, density: "compact" },
  { ...variantExample, surface: "outlined" },
  { ...variantExample, detail: "brief" },
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
  {
    ...write(
      'Draft invoice T-043 to Ben Carter dated 2026-11-19 for six river walks at 18 each. Note: "Thank you for booking with Trot." Keep the note on file without showing it.',
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Send this bill to Anna", { address: "i1/send", action: "press" }),
  read("Accept this quote", { address: "i1/accept", action: "press" }, 1),
  read("Decline this quote", { address: "i1/decline", action: "press" }, 1),
] satisfies Probe[];
type InvoiceProps = Props<typeof props, typeof meta>;
// prettier-ignore
function InvoiceLines({ lines, density }: Pick<InvoiceProps, "lines" | "density">) {
  const { lang } = useWords();
  return lines.map((line) => (
    <KitRow key={line.id} item={line.id} inline label={line.item} {...{ density }} trailing={
      <KitText role="label" part="price" tone="muted" tabular align="end" {...{ density }}
        children={moneyLine(line.price, undefined, "each", lang)} />
    }>
      <KitText part="item" {...{ density }} children={line.item} />
      <KitText role="label" part="qty" tone="muted" tabular {...{ density }} children={quantityLine(line.qty, lang)} />
    </KitRow>
  ));
}
export function Invoice(input: InvoiceProps) {
  const { lang, words } = useWords();
  const { documentLabels: copy } = words;
  const density = useVariant("density", meta.variants.density, input.density);
  const state = useComponentState(),
    { note, style, surface } = input;
  const labels = documentCopy(input, state, lang);
  const send = <KitAction part="send" {...labels.send} full />;
  return (
    <KitCard padded part="root" {...{ density, surface }}>
      <KitContent {...{ density }}>
        <KitGrid fitLast {...{ density }}>
          <KitText part="number" {...{ density }} children={labels.heading} />
          <KitText role="label" part="status" tone="muted" {...{ density }} children={labels.status} />
        </KitGrid>
        {labels.fields.map(({ part, text }) => (
          <KitText key={part} role="label" part={part} tone="muted" {...{ density }} children={text} />
        ))}
      </KitContent>
      <InvoiceLines lines={input.lines} {...{ density }} />
      <KitContent {...{ density }}>
        {labels.amounts.map(({ part, label, value }) => (
          <KitGrid key={part} fitLast {...{ density }}>
            <KitText role="label" part={null} tone="muted" {...{ density }}>
              {label}
            </KitText>
            <KitText role={part === "total" ? "number" : "label"} part={part} tabular {...{ density }}>
              {value}
            </KitText>
          </KitGrid>
        ))}
      </KitContent>
      {note && <KitText role="label" part="note" tone="muted" {...{ density }} children={note} />}
      {labels.send.kind !== "quiet" && send}
      {style === "quote" && (
        <KitGrid {...{ density }}>
          <KitAction part="accept" label={copy.accept} full />
          <KitAction part="decline" label={copy.decline} kind="danger" full />
        </KitGrid>
      )}
      {labels.send.kind === "quiet" && send}
    </KitCard>
  );
}

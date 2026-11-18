import { z } from "zod";
import {
  isoDate,
  documentAmounts,
  documentFields,
  documentHeading,
  documentLabels as copy,
  documentReading,
  documentSend,
  documentStatus,
  itemsOf,
  moneyLine,
  placeholderTitle,
  probesFor,
  quantityLine,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import { KitAction, KitCard, KitContent, KitGrid, KitRow, KitText, useComponentState } from "../../../kit";
// Core first: KeyValue/rows cannot show quantity-price lines, computed tax totals and bill/quote actions.
export const meta = {
  id: "Invoice",
  status: "draft",
  group: "content",
  purpose: "Bill a client or quote work before they accept it.",
  pick: "A business's bill or quote to a client, with quantity-price lines, tax and sending. Not plain details (KeyValue), personal bills to pay (Bills), or a shop order (OrderSummary).",
  writeHints: [
    "Write only line quantities and unit prices plus optional tax percent; code computes subtotal, tax, total and overdue.",
    'style: "quote" cannot have status: "paid". Use draft or sent for quotes.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "A document made on the device; sending it needs email or SMS.",
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
  read: (input, state) => documentReading(input as z.infer<typeof props>, state),
} as const satisfies Meta;
export const props = z
  .strictObject({
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
  .refine(({ status, style }) => style !== "quote" || status !== "paid", { path: ["status"] });
const draft = "draft" as const;
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const item = itemsOf(cast, 1)[0],
    thing = thingOf(cast);
  return {
    number: "1",
    to: (item && titleOf(item, 28, thing)) || placeholderTitle(0),
    date: "2026-11-18",
    lines: [{ item: (item && titleOf(item, 32, thing)) || placeholderTitle(0), qty: 1, price: 0 }],
    status: draft,
  };
}
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
  read("Send this bill to Anna", { address: "i1/send", action: "press" }),
  read("Accept this quote", { address: "i1/accept", action: "press" }, 1),
  read("Decline this quote", { address: "i1/decline", action: "press" }, 1),
] satisfies Probe[];
function InvoiceLines({ lines }: Props<typeof props, typeof meta>) {
  return lines.map((line) => (
    <KitRow key={line.id} item={line.id} inline label={line.item}>
      <KitText part="item">{line.item}</KitText>
      <KitGrid fitLast>
        <KitText role="caption" part="qty" tone="muted" tabular>
          {quantityLine(line.qty)}
        </KitText>
        <KitText role="caption" part="price" tone="muted" tabular align="end">
          {moneyLine(line.price, undefined, "each")}
        </KitText>
      </KitGrid>
    </KitRow>
  ));
}
export function Invoice(input: Props<typeof props, typeof meta>) {
  const state = useComponentState(),
    { number, note, style } = input;
  return (
    <KitCard padded part="root">
      <KitContent>
        <KitGrid fitLast>
          <KitText part="number">{documentHeading(style, number)}</KitText>
          <KitText role="caption" part="status" tone="muted">
            {documentStatus(input, state)}
          </KitText>
        </KitGrid>
        {documentFields(input).map(({ part, text }) => (
          <KitText key={part} role="caption" part={part} tone="muted">
            {text}
          </KitText>
        ))}
      </KitContent>
      <InvoiceLines {...input} />
      <KitContent>
        {documentAmounts(input).map(({ part, label, value }) => (
          <KitGrid key={part} fitLast>
            <KitText role="caption" part={null} tone="muted">
              {label}
            </KitText>
            <KitText role={part === "total" ? "number" : "caption"} part={part} tabular>
              {value}
            </KitText>
          </KitGrid>
        ))}
      </KitContent>
      {note && (
        <KitText role="caption" part="note" tone="muted">
          {note}
        </KitText>
      )}
      <KitAction part="send" {...documentSend(input, state)} full />
      {style === "quote" && (
        <KitGrid>
          <KitAction part="accept" label={copy.accept} full />
          <KitAction part="decline" label={copy.decline} kind="danger" full />
        </KitGrid>
      )}
    </KitCard>
  );
}

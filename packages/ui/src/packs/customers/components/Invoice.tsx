// prettier-ignore
import { useWords, KitAction, KitActionFooter, KitCard, KitContent, KitFigure, KitGrid, KitHeader, KitLayoutText, KitMetaLine, KitRow, KitRowGroup, useComponentState, useKit } from "../../../kit";
import { z } from "zod";
// prettier-ignore
import { isoDate, documentTotals, itemsOf, moneyLine, placeholderTitle, probesFor, quantityLine, text, thingOf, titleOf, type FallbackInput, type Meta, type Probe, type Props, type ThemeDensity, variantProps } from "../../../catalog";
import { invoiceCopy, invoiceReading } from "../copy";
import { prompt } from "../../../entry/prompt-Invoice.generated";
export const meta = {
  id: "Invoice",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "A document made on the device; sending it needs email or SMS.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["note"] } },
  items: { key: "lines", parts: ["root", "item", "qty", "price"] },
  // prettier-ignore
  parts: ["root", "number", "to", "date", "due", "subtotal", "tax", "total", "status", "note",
    "send", "accept", "decline", "estimate", "discount", "deposit", "balance", "recurring", "download"],
  partTiers: { send: "service", download: "service" },
  confirmParts: ["decline"],
  states: ["filled", "success"],
  successActions: ["download.press"],
  actions: {
    parts: { send: ["press"], accept: ["press"], decline: ["press"], download: ["press"] },
    when: { accept: { style: "quote" }, decline: { style: "quote" }, download: { download: true } },
  },
  read: (input, state, lang): string[] => invoiceReading(input as z.infer<typeof props>, state, lang),
} as const satisfies Meta;
// prettier-ignore
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    number: text(12).optional(),
    to: text(28),
    date: isoDate,
    due: isoDate.optional(),
    lines: z.array(z.strictObject({ item: text(32), qty: z.number().positive(), price: z.number().min(0) })).min(1).max(8),
    tax: z.number().min(0).max(100).optional(),
    status: z.enum(["draft", "sent", "paid"]),
    note: text(100).optional(),
    style: z.enum(["invoice", "quote", "estimate"]).default("invoice"),
    discount: z.number().min(0).multipleOf(0.01).optional(),
    deposit: z.number().min(0).multipleOf(0.01).optional(),
    recurring: z.enum(["none", "weekly", "monthly", "quarterly"]).optional(),
    download: z.boolean().optional(),
  })
  .refine(({ style, number }) => style === "estimate" || number !== undefined, { path: ["number"] })
  .refine(({ status, style }) => style === "invoice" || status !== "paid", { path: ["status"] })
  .superRefine((value, ctx) => {
    if (value.discount === undefined && value.deposit === undefined) return;
    const { subtotal, total } = documentTotals(value);
    if (value.discount !== undefined && (!Number.isFinite(subtotal) || value.discount > subtotal))
      ctx.addIssue({ code: "custom", path: ["discount"], message: "Discount cannot exceed subtotal." });
    if (value.deposit !== undefined && (!Number.isFinite(total) || value.deposit > total))
      ctx.addIssue({ code: "custom", path: ["deposit"], message: "Deposit cannot exceed total." });
  })
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
    number: "L-042", to: "Anna Patel", date: "2026-11-18", due: "2026-12-02",
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
    number: "T-Q07", to: "Ben Carter", date: "2026-11-18",
    lines: [{ item: "Morning park walk", qty: 8, price: 15 }],
    status: "sent", style: "quote",
  },
  variantExample,
  { ...variantExample },
  { ...variantExample },
  { ...variantExample, detail: "brief" },
  { ...variantExample, number: undefined, style: "estimate" },
  { ...variantExample, tax: 10, discount: 8, deposit: 25, recurring: "monthly", download: true },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Invoice");
// prettier-ignore
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
  { ...write("Prepare an unnumbered pre-work estimate to Ben Carter dated 2026-11-19 for six walks at 18 each. Draft, not a quote for acceptance."), expectProps: { style: "estimate" } },
  { ...write("Draft invoice T-043 to Ben Carter dated 2026-11-19 for six walks at 18 each. Apply a flat 8 dollar discount."), expectProps: { discount: 8 } },
  { ...write("Draft invoice T-043 to Ben Carter dated 2026-11-19 for six walks at 18 each. Show the 25 dollar deposit already received."), expectProps: { deposit: 25 } },
  { ...write("Draft recurring invoice T-043 to Ben Carter dated 2026-11-19 for six walks at 18 each. It repeats monthly."), expectProps: { recurring: "monthly" } },
  { ...write("Draft invoice T-043 to Ben Carter dated 2026-11-19 for six walks at 18 each. Include a Download button for the document."), expectProps: { download: true } },
] satisfies Probe[];
type InvoiceProps = Props<typeof props, typeof meta>;
// prettier-ignore
function InvoiceLines({ lines, density }: Pick<InvoiceProps, "lines"> & { density: ThemeDensity }) {
  const { lang } = useWords();
  return <KitRowGroup spacing="groups" separators={false} {...{ density }}>{lines.map((line) => (
    <KitRow key={line.id} item={line.id} inline inset="none" label={line.item} {...{ density }}
      trailing={<KitLayoutText line={{ text: moneyLine(line.price, undefined, "each", lang), part: "price", role: "meta", tone: "muted", tabular: true }} align="end" {...{ density }} />}>
      <KitMetaLine title={{ text: line.item, part: "item" }}
        meta={{ text: quantityLine(line.qty, lang), part: "qty", tabular: true }} {...{ density }} />
    </KitRow>
  ))}</KitRowGroup>;
}
// prettier-ignore
function InvoiceAmounts({ amounts, density }: { amounts: ReturnType<typeof invoiceCopy>["amounts"]; density: ThemeDensity }) {
  const figure = amounts.at(-1)?.part;
  const payment = amounts.findIndex(({ part }) => part === "deposit");
  const row = ({ part, label, value }: (typeof amounts)[number]) => (
    <KitGrid key={part} fitLast {...{ density }}>
      <KitLayoutText line={{ text: label, role: "meta", tone: "muted" }} {...{ density }} />
      {part === figure
        ? <KitFigure value={{ text: value, part }} align="end" {...{ density }} />
        : <KitLayoutText line={{ text: value, part, role: "meta", strong: part === "total", tabular: true }} align="end" {...{ density }} />}
    </KitGrid>
  );
  return <>
    <KitContent {...{ density }}>{(payment === -1 ? amounts : amounts.slice(0, payment)).map(row)}</KitContent>
    {payment !== -1 && <KitContent {...{ density }}>{amounts.slice(payment).map(row)}</KitContent>}
  </>;
}
// prettier-ignore
export function Invoice(input: InvoiceProps) {
  const { lang, words } = useWords();
  const { documentLabels: copy } = words;
  const density = useKit().density;
  const state = useComponentState(),
    { note, style } = input;
  const labels = invoiceCopy(input, state, lang);
  const sendButton = <KitAction part="send" {...labels.send} full />;
  const send = labels.download ? <KitActionFooter {...{ density }}><KitGrid {...{ density }}>
    {sendButton}<KitAction part="download" label={labels.download} kind="secondary" full />
  </KitGrid></KitActionFooter> : sendButton;
  return (
    <KitCard padded part="root" density={density}>
      <KitContent {...{ density }}>
        <KitGrid fitLast {...{ density }}>
          <KitHeader title={{ text: labels.heading, part: labels.headingPart, role: "body", strong: true }} {...{ density }} />
          <KitLayoutText line={{ text: labels.status, part: "status", role: "meta", tone: "muted" }} align="end" {...{ density }} />
        </KitGrid>
        {labels.fields.map((line) => <KitLayoutText key={line.part} line={{ ...line, role: "meta", tone: "muted" }} {...{ density }} />)}
      </KitContent>
      <InvoiceLines lines={input.lines} {...{ density }} />
      <InvoiceAmounts amounts={labels.amounts} {...{ density }} />
      {note && <KitLayoutText line={{ text: note, part: "note", role: "meta", tone: "muted" }} {...{ density }} />}
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

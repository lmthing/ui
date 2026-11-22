import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { receiptCopy, receiptLine, receiptReading } from "../copy";
import { commerceWordsFor } from "../lang";

// Core first: KeyValue/rows shows fixed facts, not receipt quantities, computed totals and reorder.
export const meta = {
  id: "OrderSummary",
  status: "ready",
  group: "content",
  purpose: "See what was ordered, what it cost and how it will arrive.",
  pick: "A receipt for one placed goods order with quantities and fulfillment details. Not simple facts (KeyValue), the editable basket (Cart), fulfillment progress (OrderStatus), or a client bill (Invoice).",
  writeHints: [
    "Write unit prices and quantities only; the total is computed. Use a real placed date in YYYY-MM-DD.",
    'Keep unit prices in the data. Only an explicit request to hide them sets detail to "brief".',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "A placed order is a record on the device; reordering adds its items to the local basket.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["price"] } },
  parts: ["root", "number", "date", "mode", "place", "total", "reorder", "reorder_label"],
  items: { key: "lines", parts: ["root", "name", "qty", "price", "line_total"] },
  states: ["filled", "loading"],
  actions: { parts: { reorder: ["press"] }, noGoto: { parts: ["reorder"] } },
  read: (input, state, lang): string[] => receiptReading(input as z.output<typeof props>, state, lang),
} as const satisfies c.Meta;

const lineProps = z.strictObject({
  name: c.text(28),
  qty: z.int().min(1).max(99),
  price: z.number().min(0).multipleOf(0.01),
});
export const props = z.strictObject({
  number: c.text(12),
  date: c.isoDate,
  lines: z.array(lineProps).min(1).max(8),
  mode: z.enum(["pickup", "delivery", "table"]),
  place: c.text(60).optional(),
  ...c.variantProps(meta.variants),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const names = c
    .itemsOf(cast, 3)
    .map((item) => c.titleOf(item, 28, thing))
    .filter((name) => name !== undefined);
  return {
    number: c.wordsFor(lang).placeholderValue,
    date: "1970-01-01",
    lines: (names.length ? names : [c.placeholderTitle(0, lang)]).map((name) => ({
      name,
      qty: 1,
      price: Number(c.placeholderValue),
    })),
    mode: "pickup",
  };
}

const pickup = {
  number: "PL-104",
  date: "2026-11-20",
  lines: [
    { name: "Fern pot", qty: 2, price: 12 },
    { name: "Basil planter", qty: 1, price: 10.5 },
    { name: "Seed packet", qty: 3, price: 2.25 },
  ],
  mode: "pickup",
  place: "Glasshouse counter",
} satisfies z.input<typeof props>;

export const examples = [
  pickup,
  {
    number: "TR-125",
    date: "2026-11-21",
    lines: [
      { name: "Reflective lead", qty: 1, price: 18 },
      { name: "Training bites", qty: 2, price: 4.75 },
    ],
    mode: "delivery",
  },
  { ...pickup },
  { ...pickup },
  { ...pickup, detail: "brief" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("OrderSummary");
export const probes = [
  choose(
    "Show a receipt for one completed purchase with the order number, date, items and quantities, and where to collect it",
  ),
  choose(
    "Show simple labelled facts about a fern: species, room and watering frequency, with no items or totals",
    "KeyValue",
  ),
  write(
    "Write the receipt for placed order PL-104 on 2026-11-20: two fern pots at 12 each, pickup at the Glasshouse counter.",
  ),
  {
    ...write(
      "Show my receipt for order PL-104 placed November 20, 2026: two fern pots at 12 each and one basil planter at 10.50, pickup at the Glasshouse counter. Show quantities and the total for each line, but do not display per-item prices.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Reorder the same two fern pots from my receipt PL-104.", { address: "o1/reorder", action: "press" }),
] satisfies c.Probe[];

type OrderSummaryProps = c.Props<typeof props, typeof meta>;
type LineProps = Pick<OrderSummaryProps, "detail"> & { density: c.ThemeDensity } & {
  line: OrderSummaryProps["lines"][number];
  loading: boolean;
};

// prettier-ignore
function ReceiptRow({ line, density, detail, loading }: LineProps) {
  const { lang, words } = kit.useWords(commerceWordsFor);
  const { name, qty, price, extended } = receiptLine(line, detail, lang);
  const summary = price ? `${qty}${words.receiptSeparator}${price}` : qty;
  const amount = loading
    ? <kit.KitSkeleton shape="figure" inset="none" emphasis="quiet" {...{ density }} content={[["number", extended, "end", "compact"]]} />
    : <kit.KitText role="number" numberScale="compact" emphasis="quiet" tone="muted" part="line_total" tabular {...{ density }}>{extended}</kit.KitText>;
  return <kit.KitRow label={name} inline fitContent {...{ density }} {...(loading ? {} : { item: line.id })} trailing={amount}>
    <kit.KitLayoutText line={{ text: name, part: "name", role: "body" }} {...{ density }} />
    {loading ? <kit.KitLayoutText line={{ text: summary, role: "caption" }} {...{ density }} /> :
      <kit.KitText role="caption" tone="muted" part={null} {...{ density }}>
        <kit.KitText role="caption" tone="muted" part="qty" tabular {...{ density }}>{qty}</kit.KitText>
        {price && <>{words.receiptSeparator}<kit.KitText role="caption" tone="muted" part="price" tabular {...{ density }}>{price}</kit.KitText></>}
      </kit.KitText>
    }
  </kit.KitRow>;
}

// prettier-ignore
export function OrderSummary(input: OrderSummaryProps) {
  const { lang, words } = kit.useWords(commerceWordsFor);
  const density = kit.useKit().density;
  const surface = "card";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const loading = kit.useComponentState() === "loading";
  const { number, date, mode, place, total } = receiptCopy(input, lang);
  const fulfillment = place ? `${mode}${words.receiptSeparator}${place}` : mode;
  return <kit.KitCard padded part="root" {...{ density, surface }}>
    {loading ? <kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[["heading", number], ["caption", date], ["caption", fulfillment]]} /> :
      <kit.KitContent {...{ density }}>
        <kit.KitText role="heading" part="number" {...{ density }}>{number}</kit.KitText>
        <kit.KitText role="caption" tone="muted" part="date" {...{ density }}>{date}</kit.KitText>
        <kit.KitText role="caption" tone="muted" part={null} {...{ density }}>
          <kit.KitText role="caption" tone="muted" part="mode" {...{ density }}>{mode}</kit.KitText>
          {place && <>{words.receiptSeparator}<kit.KitText role="caption" tone="muted" part="place" {...{ density }}>{place}</kit.KitText></>}
        </kit.KitText>
      </kit.KitContent>}
    <kit.KitContent group={density === "compact" ? "content" : "response"} {...{ density }}>
      <kit.KitRowGroup spacing="groups" separators={false} {...{ density }}>
        {input.lines.map((line) => <ReceiptRow key={line.id} {...{ line, density, detail, loading }} />)}
      </kit.KitRowGroup>
    </kit.KitContent>
    <kit.KitContent group={density === "compact" ? "content" : "response"} {...{ density }}>
      <kit.KitGrid fitLast {...{ density }}>
        {loading ? <kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[["body", words.orderTotal]]} /> :
          <kit.KitText part={null} {...{ density }}>{words.orderTotal}</kit.KitText>}
        {loading ? <kit.KitSkeleton shape="figure" inset="none" emphasis="hero" {...{ density }} content={[["number", total, "end", "compact"]]} /> :
          <kit.KitText role="number" numberScale="compact" emphasis="hero" tabular part="total" {...{ density }}>{total}</kit.KitText>}
      </kit.KitGrid>
    </kit.KitContent>
    {loading ? <kit.KitSkeleton shape="control" kind="secondary" label={words.reorder} inset="none" full /> :
      <kit.KitAction label={words.reorder} kind="secondary" part="reorder" action="press" full />}
  </kit.KitCard>;
}

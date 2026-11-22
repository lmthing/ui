import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { cartLineCopy, cartReading, cartTotals } from "../copy";
import { commerceWordsFor } from "../lang";

// Core first: List/rows lists products, not editable quantities, line prices, promo input and computed totals.
export const meta = {
  id: "Cart",
  status: "ready",
  group: "content",
  purpose: "Review and edit what you are about to buy.",
  pick: "One shopping basket before ordering, with editable quantities, removal, a promo code and computed totals. Not browsing several past orders (List), a receipt for one placed order (OrderSummary), or a grocery checklist (GroceryList).",
  writeHints: [
    "Write each line's unit price and quantity. The optional delivery charge is separate; do not write subtotals, line totals or a grand total.",
    'Keep supplied variant names in the line data. If asked to hide only those notes, write exactly {"detail":"brief"} for the axes.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The basket is kept on the device.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["variant"] } },
  parts: ["root", "empty", "promo", "subtotal", "delivery", "total"],
  items: {
    key: "lines",
    parts: ["root", "name", "variant", "photo", "qty", "price", "remove"],
    adjust: {
      "qty.increment": { prop: "qty", delta: 1, min: 1, max: 99 },
      "qty.decrement": { prop: "qty", delta: -1, min: 1, max: 99 },
    },
  },
  confirmParts: ["remove"],
  states: ["filled", "empty", "loading"],
  actions: { parts: { promo: ["type"] }, items: { qty: ["increment", "decrement"], remove: ["press"] } },
  read: (input, state, lang): string[] => cartReading(input as z.output<typeof props>, state, lang),
} as const satisfies c.Meta;

const lineProps = z.strictObject({
  name: c.text(28),
  variant: c.text(20).optional(),
  photo: c.photo,
  qty: z.int().min(1).max(99),
  price: z.number().min(0).multipleOf(0.01),
});
export const props = z
  .strictObject({
    lines: z.array(lineProps).min(1).max(8),
    delivery: z.number().min(0).multipleOf(0.01).optional(),
    ...c.variantProps(meta.variants),
  })
  .overwrite((input) =>
    input.detail === "brief"
      ? { ...input, lines: input.lines.map((line) => ({ ...line, variant: undefined })) }
      : input,
  );

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const names = c
    .itemsOf(cast, 3)
    .map((item) => c.titleOf(item, 28, thing))
    .filter((name) => name !== undefined);
  return {
    lines: (names.length ? names : [c.placeholderTitle(0, lang)]).map((name) => ({
      name,
      photo: "local:1",
      qty: 1,
      price: Number(c.placeholderValue),
    })),
  };
}

const ledgeBasket = {
  delivery: 3,
  lines: [
    { name: "Fern pot", variant: "Olive", photo: "lib:fern", qty: 2, price: 12 },
    { name: "Basil planter", photo: "lib:basil", qty: 1, price: 10 },
  ],
} satisfies z.input<typeof props>;

// prettier-ignore
export const examples = [ledgeBasket,
  { lines: [{ name: "Reflective lead", photo: "lib:dog", qty: 1, price: 18 }] },
  { ...ledgeBasket, detail: "brief" }] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Cart");
export const probes = [
  choose(
    "Review my basket before buying, with plus and minus on every item, a discount code box and a subtotal and total",
  ),
  choose(
    "Let me scan and tap several past purchases: one row per order, showing only its order number and status badge. Do not show any items or totals from inside an order.",
    "List",
  ),
  write(
    "A basket with two Olive fern pots at 12 each and one basil planter at 10, photos lib:fern and lib:basil, plus 3 delivery.",
  ),
  {
    ...write(
      "Show my shopping basket: two fern pots in Olive at 12 each and one basil planter at 10, photos lib:fern and lib:basil. Keep Olive saved with the product but hide this variant note on the basket screen. Keep photos and quantities visible.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Remove the basil planter from the basket", { address: "c1/r2/remove", action: "press" }),
] satisfies c.Probe[];

type CartProps = c.Props<typeof props, typeof meta>;
type CartLine = CartProps["lines"][number];
type LineView = { line: CartLine; density: c.ThemeDensity; detail: CartProps["detail"]; loading: boolean };

// prettier-ignore
function BasketLineDetails({ line, density, detail, loading }: LineView) {
  const { lang, words } = kit.useWords(commerceWordsFor);
  const { price, note, unitPrice, variant } = cartLineCopy(line, detail, lang);
  const photo = <kit.KitPhoto photo={line.photo} part={loading ? null : "photo"} label={line.name} loading={loading} />;
  return <kit.KitContent lead={photo} leadingAlign="row" rhythm="flush" {...{ density }}>
    <kit.KitGrid fitLast {...{ density }}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["body", line.name]]} {...{ density }} /> :
        <kit.KitText role="body" part="name" {...{ density }}>{line.name}</kit.KitText>}
      {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["number", price, "end", "compact"]]} emphasis="quiet" {...{ density }} /> :
        <kit.KitText role="number" numberScale="compact" emphasis="quiet" tone="muted" tabular part="price" {...{ density }}>{price}</kit.KitText>}
    </kit.KitGrid>
    {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["caption", note]]} {...{ density }} /> :
      <kit.KitText role="caption" tone="muted" part={null} {...{ density }}>
        {variant && <><kit.KitText role="caption" tone="muted" part="variant" {...{ density }}>
          {variant}
        </kit.KitText>{words.receiptSeparator}</>}{unitPrice}
      </kit.KitText>}
  </kit.KitContent>;
}

// prettier-ignore
function QuantitySkeleton({ qty }: { qty: number }) {
  const { lang, words: { cart } } = kit.useWords(commerceWordsFor);
  const button = <kit.KitSkeleton shape="control" />;
  const number = <kit.KitSkeleton shape="figure" inset="none" content={[["number", c.numberLine(qty, lang), "center", "compact"]]} />;
  return <kit.KitRow inline label={cart.quantity} leadingAlign="row" leading={button}>
    <kit.KitRow inline label={cart.quantity} leadingAlign="row" leading={number}>{button}</kit.KitRow>
  </kit.KitRow>;
}

// prettier-ignore
function BasketLine({ line, density, detail, loading }: LineView) {
  const { words: { cart } } = kit.useWords(commerceWordsFor);
  return <kit.KitRow {...(loading ? {} : { item: line.id })} label={line.name} inset="none" {...{ density }}>
    <kit.KitContent {...{ density }}>
      <BasketLineDetails {...{ line, density, detail, loading }} />
      <kit.KitContent group="response" {...{ density }}><kit.KitGrid fitLast {...{ density }}>
        {loading ? <QuantitySkeleton qty={line.qty} /> :
          <kit.KitStepper part="qty" value={line.qty} min={1} max={99} />}
        {loading ? <kit.KitSkeleton shape="control" kind="secondary" /> :
          <kit.KitAction part="remove" action="press" kind="quiet" icon="close" a11y={cart.remove(line.name)} />}
      </kit.KitGrid></kit.KitContent>
    </kit.KitContent>
  </kit.KitRow>;
}

// prettier-ignore
function BasketTotals({ input, density, loading }: { input: CartProps; density: c.ThemeDensity; loading: boolean }) {
  const { lang } = kit.useWords(commerceWordsFor);
  return <kit.KitPinnedBottom>
    <kit.KitContent group="response" {...{ density }}>
      {cartTotals(input, lang).map(({ part, label, amount }) => {
        const emphasis = part === "total" ? "hero" : "normal";
        const tone = part === "total" ? "text" : "muted";
        const numberScale = part === "total" ? "display" : "compact";
        return <kit.KitGrid key={part} fitLast {...{ density }}>
          {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["body", label]]} {...{ density }} /> :
            <kit.KitText part={null} {...{ tone, density }}>{label}</kit.KitText>}
          {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["number", amount, "end", numberScale]]} {...{ density, emphasis }} /> :
            <kit.KitText role="number" tabular {...{ part, density, tone, emphasis, numberScale }}>{amount}</kit.KitText>}
        </kit.KitGrid>;
      })}
    </kit.KitContent>
  </kit.KitPinnedBottom>;
}

// prettier-ignore
export function Cart(input: CartProps) {
  const { words: { cart } } = kit.useWords(commerceWordsFor);
  const { thing } = kit.usePartContext();
  const state = kit.useComponentState();
  const density = kit.useKit().density;
  const surface = "card";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const loading = state === "loading";
  return <kit.KitCard padded part="root" {...{ density, surface }}>
    {state === "empty" ? <kit.KitEmpty icon="shopping_bag" part="empty" decorativeIcon {...(!thing ? { title: cart.empty } : {})} /> : <>
      <kit.KitGrid arrange="rows" list {...{ density }}>{input.lines.map((line) =>
        <BasketLine key={line.id} {...{ line, density, detail, loading }} />)}</kit.KitGrid>
      <kit.KitContent group={density === "compact" ? "content" : "response"} {...{ density }}>
        <kit.KitLayoutText line={{ text: cart.promo, role: "meta", tone: "muted" }} {...{ density }} />
        {loading ? <kit.KitSkeleton shape="control" kind="secondary" label={cart.promo} full inset="none" /> : <kit.KitInput part="promo" label={cart.promo} hint="" compact />}
      </kit.KitContent>
      <BasketTotals {...{ input, density, loading }} />
    </>}
  </kit.KitCard>;
}

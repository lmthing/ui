import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { productDetailCopy, productDetailReading } from "../copy";
import { commerceWordsFor } from "../lang";

const minQty = 1;
const maxQty = 99;
const limitFor = (stock: number | undefined) => Math.min(stock ?? maxQty, maxQty);

// Core first: Amount/was shows a sale price, not the product, stock, save and quantity-to-add controls together.
export const meta = {
  id: "Product",
  status: "ready",
  group: "content",
  purpose: "Decide whether to buy one product and add the desired quantity.",
  pick: "One product for sale with a description, stock, saving or quantity and add controls. Not a price alone (Amount), several products (ProductGrid), or a timed service (ServiceMenu).",
  writeHints: [
    "Write the current price and the optional old price as numbers, with no currency. Write stock only when known. Leave qty null unless asked to start with a specific quantity.",
    'When only asked to hide the description, keep its text and write "detail":"brief","density":null,"surface":null. Do not write "card" for the default surface.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Product records and saved products live on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["description"] } },
  // prettier-ignore
  parts: ["root", "name", "price", "was", "description", "stock", "badge",
    "qty", "add", "add_label", "save", "save_icon", "success"],
  states: ["filled", "loading", "success"],
  actions: {
    parts: { qty: ["increment", "decrement"], add: ["press"], save: ["toggle"] },
    when: {
      "qty.increment": { canIncrease: true },
      "qty.decrement": { canDecrease: true },
      add: { available: true },
    },
  },
  // The shared numeric setter projects adjustment values; `set` itself is not offered.
  set: { qty: { prop: "qty", min: minQty, max: maxQty, integer: true } },
  adjust: {
    "qty.increment": { prop: "qty", delta: 1, min: minQty, max: maxQty },
    "qty.decrement": { prop: "qty", delta: -1, min: minQty, max: maxQty },
  },
  live: {
    derive: ({ detail }) => (detail === "brief" ? { description: undefined } : {}),
  },
  readSuccess: true,
  read: (input, state, lang): string[] => productDetailReading(input as z.output<typeof props>, state, lang),
} as const satisfies c.Meta;

// prettier-ignore
export const props = z.strictObject({
  name: c.text(32),
  price: z.number().min(0).multipleOf(0.01),
  was: z.number().min(0).multipleOf(0.01).optional(),
  description: c.text(240),
  stock: z.int().min(0).optional(),
  badge: c.text(12).optional(),
  saved: z.boolean(),
  qty: z.int().min(minQty).max(maxQty).default(minQty),
  ...c.variantProps(meta.variants),
}).overwrite((input) => {
  const limit = limitFor(input.stock);
  const qty = Math.min(input.qty, Math.max(minQty, limit));
  return { ...input, qty, available: limit > 0, canIncrease: qty < limit, canDecrease: qty > minQty };
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const item = c.itemsOf(cast, 1)[0];
  return {
    name: (item && c.titleOf(item, 32, thing)) || c.placeholderTitle(0, lang),
    price: Number(c.placeholderValue),
    description: (item && c.detailOf(item, 240, thing)) || c.wordsFor(lang).placeholderDetail,
    saved: false,
  };
}

export const examples = [
  {
    name: "Ceramic fern pot",
    price: 12,
    was: 16,
    description: "Glazed pot with drip\u00a0tray.",
    stock: 3,
    badge: "Sale",
    saved: false,
  },
  {
    name: "Reflective lead",
    price: 18,
    description: "A soft-grip lead for early walks.",
    saved: true,
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Product");
export const probes = [
  choose(
    "Show the detail page for one ceramic pot with its description, price, stock, save heart and a quantity control beside Add to basket",
  ),
  choose(
    "Show only the current price with the old price struck through, no product details or actions",
    "Amount",
  ),
  write(
    "Write the detail panel for a ceramic fern pot with a matching drip tray, now 12 down from 16, three left, tagged Sale and not saved",
  ),
  {
    ...write(
      "Show one ceramic fern pot for $12, three left and not saved. Keep the matching-drip-tray description in the data, but hide it from the product page.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Save the ceramic fern pot for later", { address: "p1/save", action: "toggle" }),
] satisfies c.Probe[];

type ProductProps = c.Props<typeof props, typeof meta>;

// prettier-ignore
function ProductDetails({ input, density, state }: { input: ProductProps; density: c.ThemeDensity; state: c.StateName }) {
  const { lang, words: { product: words } } = kit.useWords(commerceWordsFor);
  const { screen, component } = kit.usePartContext();
  const saved = kit.useControlValue(`${screen}/${component}/save`, input.saved);
  const { price, was, stock } = productDetailCopy(input, lang);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const loading = state === "loading", description = detail === "brief" ? undefined : input.description;
  const bar = (role: kit.TextRole, text: string | undefined) => text === undefined ? null :
    <kit.KitSkeleton shape="figure" inset="none" content={[[role, text]]} {...{ density }} />;
  const prices = loading ? <kit.KitContent {...{ density }}>
    {bar("body", price)}{bar("label", was)}
  </kit.KitContent> : <kit.KitContent {...{ density }}>
    <kit.KitText part="price" role="number" numberScale="compact" tabular {...{ density }}>{price}</kit.KitText>
    {was !== undefined && <kit.KitText part="was" role="label" tone="muted" strike tabular {...{ density }}>{was}</kit.KitText>}
  </kit.KitContent>;
  const badge = input.badge && (loading ? <kit.KitSkeleton shape="control" kind="quiet" label={input.badge} /> :
    <kit.KitTrail part="badge" kind="badge" value={input.badge} tone="good" {...{ density }} />);
  return <>
    <kit.KitRow part={null} inline label={input.name} lineRole="heading" {...{ density }}
      trailing={state === "filled" && <kit.KitAction part="save" action="toggle" icon={saved ? "check" : "heart"}
        kind={saved ? "primary" : "quiet"} a11y={saved ? words.unsave : words.save} />}>
      {loading ? bar("heading", input.name) : <kit.KitText part="name" role="heading" {...{ density }}>{input.name}</kit.KitText>}
    </kit.KitRow>
    {badge ? <kit.KitContent lead={prices} leadingAlign="row" {...{ density }}>
      <kit.KitContent lead={badge} leadingAlign="row" {...{ density }}>{null}</kit.KitContent>
    </kit.KitContent> : prices}
    {loading ? bar("body", description) : description &&
      <kit.KitText part="description" tone="muted" {...{ density }}>{description}</kit.KitText>}
    {loading ? bar("label", stock) : stock &&
      <kit.KitText part="stock" role="label" tone={input.stock === 0 ? "bad" : "muted"} {...{ density }}>{stock}</kit.KitText>}
  </>;
}

// prettier-ignore
function ProductBar({ input, state, density }: { input: ProductProps; state: c.StateName; density: c.ThemeDensity }) {
  const { lang, words: { product: words } } = kit.useWords(commerceWordsFor);
  const soldOut = input.stock === 0;
  const count = soldOut ? 0 : input.qty;
  const number = c.numberLine(count, lang);
  const target = <kit.KitSkeleton shape="control" />;
  // A figure space reserves one tabular digit, matching the stepper without showing a quantity.
  const figure = "\u2007".repeat(String(count).length);
  const numberBar = <kit.KitSkeleton shape="figure" inset="none" content={[["number", figure, "center", "compact"]]} />;
  const stepper = state === "loading" ? <kit.KitRow part={null} inline label={words.quantity(number)} leading={target} leadingAlign="row">
    <kit.KitRow part={null} inline label={words.quantity(number)} leading={numberBar} leadingAlign="row">
      {target}
    </kit.KitRow>
  </kit.KitRow> : <kit.KitStepper part="qty" value={count}
    min={minQty} max={limitFor(input.stock)} disabled={soldOut} />;
  return <kit.KitContent group="response" {...{ density }}>
    {state === "success" ? <kit.KitRow inline part={null} surface="tinted" tone="good" label={words.added} {...{ density }}>
      <kit.KitContent inset="md" leadingAlign="row" lead={<kit.KitIcon name="check" tone="good" decorative />} {...{ density }}>
        <kit.KitText part="success" role="label" tone="good" {...{ density }}>{words.added}</kit.KitText>
      </kit.KitContent>
    </kit.KitRow> : <kit.KitContent lead={stepper} leadingAlign="row" {...{ density }}>
      {state === "loading" ? <kit.KitSkeleton shape="control" label={words.add} full /> :
        <kit.KitAction part="add" action="press" label={words.add} disabled={soldOut} full />}
    </kit.KitContent>}
  </kit.KitContent>;
}

// prettier-ignore
export function Product(input: ProductProps) {
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  return <>
    <kit.KitCard part="root" padded {...{ density, surface }} {...(surface === "plain" ? { inset: "none" as const } : {})}>
      <ProductDetails {...{ input, density, state }} />
    </kit.KitCard>
    <kit.KitPinnedBottom>
      <ProductBar {...{ input, state, density }} />
    </kit.KitPinnedBottom>
  </>;
}

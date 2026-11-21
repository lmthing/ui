import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { productDetailCopy, productDetailReading, productStoreLines } from "../copy";
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
    'Store name, aisle and storeStock describe the physical store; stock is for online quantity. Use cleanTags for short shopping claims. For a barcode scan use scan: {"goto":"scan_barcode"} with the requested Camera scan screen id.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Product records and saved products live on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["description"] } },
  // prettier-ignore
  parts: ["root", "name", "price", "was", "description", "stock", "badge",
    "qty", "add", "add_label", "save", "save_icon", "success", "aisle", "store_name", "store_stock",
    "clean_tags", "clean_tag_1", "clean_tag_2", "clean_tag_3", "clean_tag_4", "scan", "scan_label", "scan_icon"],
  partTiers: { scan: "ok" },
  states: ["filled", "loading", "success"],
  actions: {
    parts: { qty: ["increment", "decrement"], add: ["press"], save: ["toggle"], scan: ["press"] },
    when: {
      "qty.increment": { canIncrease: true },
      "qty.decrement": { canDecrease: true },
      add: { available: true },
      scan: { can_scan: true },
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
  aisle: c.text(16).optional(), storeName: c.text(24).optional(), storeStock: z.int().min(0).optional(),
  cleanTags: z.array(c.text(16)).min(1).max(4).optional(), scan: z.strictObject({ goto: c.screenId }).optional(),
  qty: z.int().min(minQty).max(maxQty).default(minQty),
  ...c.variantProps(meta.variants),
}).overwrite((input) => {
  const limit = limitFor(input.stock);
  const qty = Math.min(input.qty, Math.max(minQty, limit));
  return { ...input, qty, available: limit > 0, canIncrease: qty < limit, canDecrease: qty > minQty, can_scan: !!input.scan };
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

// prettier-ignore
export const examples = [
  { name: "Ceramic fern pot", price: 12, was: 16, description: "Glazed pot with drip\u00a0tray.", stock: 3, badge: "Sale", saved: false },
  { name: "Reflective lead", price: 18, description: "A soft-grip lead for early walks.", saved: true },
  { name: "Fern pot", price: 12, description: "A glazed pot with a drip tray.", saved: false, aisle: "B4",
    storeName: "Market Street", storeStock: 7, cleanTags: ["Peat free", "Locally made"], scan: { goto: "scan_barcode" } },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Product");
// prettier-ignore
export const probes = [
  choose("Show the detail page for one ceramic pot with its description, price, stock, save heart and a quantity control beside Add to basket"),
  choose("Show only the current price with the old price struck through, no product details or actions", "Amount"),
  write("Write the detail panel for a ceramic fern pot with a matching drip tray, now 12 down from 16, three left, tagged Sale and not saved"),
  {
    ...write("Show one ceramic fern pot for $12, three left and not saved. Keep the matching-drip-tray description in the data, but hide it from the product page. Leave the spacing and surface unchanged."),
    variant: { axis: "detail", value: "brief" },
  },
  { ...write("Show an unsaved fern pot at $12 with a short description. I can find it in aisle B4."), expectProps: { aisle: "B4" } },
  { ...write("Show an unsaved fern pot at $12 with a short description. Name the physical store Market Street."), expectProps: { storeName: "Market Street" } },
  { ...write("Show an unsaved fern pot at $12 with a short description. There are 7 in the physical store; online stock is unknown."), expectProps: { storeStock: 7 } },
  { ...write('Show an unsaved fern pot at $12 with a short description. Show the shopping claims "Peat free" then "Locally made" as chips.'), expectProps: { cleanTags: ["Peat free", "Locally made"] } },
  { ...write("Show an unsaved fern pot at $12 with a short description. Give me a barcode scan button that opens scan_barcode."), expectProps: { scan: { goto: "scan_barcode" } } },
  read("Save the ceramic fern pot for later", { address: "p1/save", action: "toggle" }),
  read("Open the barcode scanner", { address: "p1/scan", action: "press" }, 2),
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
  const [storeName, aisle, storeStock] = productStoreLines(input, lang);
  const bar = (role: kit.TextRole, text: string | undefined) => text === undefined ? null :
    <kit.KitSkeleton shape="figure" inset="none" content={[[role, text]]} {...{ density }} />;
  const save = loading ? <kit.KitSkeleton shape="control" inset="none" /> : state === "filled" &&
    <kit.KitAction part="save" action="toggle" icon={saved ? "check" : "heart"}
      kind="quiet" a11y={saved ? words.unsave : words.save} />;
  return <>
    <kit.KitRow inline fitContent label={input.name} part={null} lineRole="heading" trailing={save} {...{ density }}>
      <kit.KitContent {...{ density }}>
        {loading ? bar("heading", input.name) : <kit.KitText part="name" role="heading" {...{ density }}>{input.name}</kit.KitText>}
        <kit.KitLayoutText line={{ text: price, part: "price", role: "figure", compact: true, tabular: true }} {...{ density }} />
        {loading ? bar("label", was) : was !== undefined && <kit.KitText part="was" role="label" tone="muted" strike tabular {...{ density }}>{was}</kit.KitText>}
      </kit.KitContent>
    </kit.KitRow>
    {input.badge && <kit.KitContent leadingAlign="row"
      lead={<kit.KitTrail part="badge" kind="badge" value={input.badge} tone="good" {...{ density }} />}>{null}</kit.KitContent>}
    {loading ? bar("body", description) : description &&
      <kit.KitText part="description" tone="muted" {...{ density }}>{description}</kit.KitText>}
    {loading ? bar("label", stock) : stock &&
      <kit.KitText part="stock" role="label" tone={input.stock === 0 ? "bad" : "muted"} {...{ density }}>{stock}</kit.KitText>}
    {(storeName[1] || aisle[1]) && <kit.KitContent group="response" rhythm="flush" {...{ density }}>
      {[storeName, aisle].map(([part, text]) => <kit.KitLayoutText key={part} line={{ text, part, role: "meta", tone: "muted" }} {...{ density }} />)}
    </kit.KitContent>}
    {storeStock[1] && <kit.KitContent group="response" {...{ density }}>
      <kit.KitLayoutText line={{ text: storeStock[1], part: storeStock[0], role: "figure", compact: true, tone: "muted" }} {...{ density }} />
    </kit.KitContent>}
    {input.cleanTags && <kit.KitTrack part="clean_tags">{input.cleanTags.map((tag, index) =>
      <kit.KitTrail key={index} part={`clean_tag_${index + 1}`} kind="badge" tone="text" value={tag} />)}</kit.KitTrack>}
    {input.scan && state === "filled" && <kit.KitAction part="scan" kind="secondary" action="press" icon="camera" label={words.scan} goto={input.scan.goto} />}
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

# `commerce` pack

**Status:** revised · **Wave:** 3 · **Pick line:** Selling things for money: a shop, a bakery, a stall. Not
booking time (`booking`).

## Purpose

Goods on offer, a basket, an order and its progress, from both sides: the buyer browsing and ordering, and
the seller seeing orders come in, moving them on and keeping products up to date. It covers small sellers
(a bakery taking pre-orders, a market stall, a maker selling prints). Taking payment is always a `service`
part.

## Apps it serves

Bakery or café pre-orders, market stall, maker or artist shop, school uniform swap with prices, farm box
subscriptions, takeaway menu, merch for a band or club, plant shop.

## What the core already covers

- A price, a total, a struck-through old price: `Amount` (`inline`, `total`, `was`).
- Product photos: `Gallery` style `carousel`; star rating: `Scale` with `readonly`.
- Categories: `Chips`; finding a product: `Search`; "Popular": `List` style `shelf` under a `SectionTitle`.
- Order placed: `Success`; emptying the basket: `Button` with `confirm`.
- The seller's order list: `List` (rows with order number, time and a `badge` status).
- Editing a product: `Field`s, `Composer` style `entry`, `Field` kind `photo`.

The first plan's `Price` is now core `Amount`, and its `Quantity` is a part of `Product` and `Cart` (a
separate stepper was a near miss with `Counter`). In Wave 6, product reviews are served by the proposed
promotion of `customers/Review` to **Core** (with `photos`, `fitScale`, `spoiler` and `verified` props).

## Components (11)

### `Product` · planned · content · phone
One product's page body: name, price (with the old price if on sale), a short description and stock ("Only
3 left"), with a heart to save it; the quantity stepper and the add button sit in a bar pinned to the
bottom of the screen.
- Pick: one item for sale, fully. Not a grid of items (`ProductGrid`), not a service with a duration
  (booking `ServiceMenu`).
- Writes: `name` text(32), `price` number, `was` number optional, `description` text(240), `stock` number
  optional, `badge` text(12) optional, `saved` boolean.
- Parts → actions: `qty increment`, `qty decrement`, `add press`, `save toggle`.
- States: filled, loading, success (added). · Real path: product records on the device.
- Wave 6 options: add optional `aisle` text(16), `storeName` text(24), `storeStock` int, `cleanTags` chips, and `scan press` (`Camera[scan]`, `meta.partTiers: { scan: "ok" }`).

### `ProductGrid` · planned · content · phone
Products as a two-column grid of photo cards with name, price, a sale badge and a quick add; or as menu rows
(name, a line, price, photo on the right) for food.
- Pick: browsing several things for sale. Not pictures without prices (`Gallery`), not services (booking
  `ServiceMenu`), not things the person owns (inventory `Things`).
- Writes: `items` of `name` text(28), `price` number, `was` number optional, `photo`, `badge` text(12)
  optional, `sub` text(48) optional (`menu`), `goto`, 1–8; `style`.
- Styles: `grid` (default), `menu`, `deals` (Wave 6: `claimed` 0–100% progress bar, discount badge and countdown header).
- Parts → actions: items `root press`, items `add press`. · States: filled, empty, loading.
- Real path: a product query on the device.

### `VariantPicker` · planned · input · phone
The options of one product: colour swatches, size boxes or named choices, unavailable ones crossed out, and
the price difference per option.
- Pick: choosing a size, colour or kind of one product. Not filtering many products (`Chips`), not a plan
  (`Choice`).
- Writes: `label` text(16), `options` of `label` text(16), `swatch` (from the `swatch` vocabulary; style
  `swatch` only), `available` boolean, `extra` number optional, 2–6; `at`; `style`.
- Styles: `named` (default), `size`, `swatch`, `shade` (Wave 6: undertone and depth grouping for Fair/Light/Medium/Deep × Cool/Neutral/Warm shades).
- Parts → actions: items `root select` (available only). · States: filled.
- Real path: variants stored with the product.

### `Cart` · planned · content · phone
The basket: one line per item with photo, name, variant, a quantity stepper and the line price; a promo
code box; subtotal, delivery and total at the foot.
- Pick: what the person is about to buy. Not a placed order (`OrderSummary`), not groceries to buy in a shop
  (kitchen `GroceryList`).
- Writes: `lines` of `name` text(28), `variant` text(20) optional, `photo`, `qty` 1–99, `price` number,
  1–8; `delivery` number optional. Subtotal and total are computed by code.
- Parts → actions: items `qty increment`, items `qty decrement`, items `remove press` (in
  `confirmParts`), `promo type`. · States: filled, empty, loading.
- Real path: the basket kept on the device.

### `CartBar` · planned · action · phone
A bar pinned to the bottom while shopping: the item count, the total and "View basket", shown only when the
basket has something in it.
- Pick: a way back to the basket while browsing. Not the screen's main action (`Button`), not the basket
  (`Cart`).
- Writes: `goto` only. The count and total come from the basket the host keeps.
- Parts → actions: `root press`. · States: filled, empty (hidden). · Region: bottom.
- Real path: the basket's count and total on the device.

### `Checkout` · planned · input · phone
The last step: pickup or delivery, the time, the address, how to pay (card, cash on pickup), the total from
the basket, and "Place order".
- Pick: finishing an order. Not reviewing a booking (booking `Appointment` `summary`), not the basket
  (`Cart`).
- Writes: `modes` subset of (`pickup`, `delivery`, `table`), `mode`, `time` text(20) optional, `address`
  text(60) optional, `methods` subset of (`card`, `cash`, `wallet`), `method`.
- Parts → actions: `mode select`, `method select`, `address press`, `place press` (`partTiers`: `service`
  for `card` and `wallet`). · States: filled, success.
- Real path: a payment service takes card payments; cash on pickup works on the phone alone.

### `OrderSummary` · planned · content · phone
A placed order as a receipt: number, date, items with quantities, totals, how it is fulfilled and where.
- Pick: what was ordered. Not the basket before ordering (`Cart`), not where it is now (`OrderStatus`), not
  a client's bill (customers `Invoice`).
- Writes: `number` text(12), `date`, `lines` of `name` text(28), `qty`, `price`, 1–8; `mode` (`pickup`,
  `delivery`, `table`), `place` text(60) optional. Totals are computed by code.
- Parts → actions: `reorder press`. · States: filled, loading.
- Real path: an order record on the device.

### `OrderStatus` · planned · data · phone
Where an order is: three to five steps (received, preparing, ready, collected or on its way, delivered) with
the current one lit and its time, and a short line ("Ready at 10:30"). On the seller's side, a button moves
it to the next step.
- Pick: the progress of one order. Not a delivery on a map (places `DeliveryTracker`), not steps through a
  form (`Steps`).
- Writes: `steps` of `label` text(16), `time` HH:MM optional, 3–5; `at` index; `line` text(48) optional;
  `seller` boolean (shows the next-step button).
- Parts → actions: `next press` (seller). · States: filled, success (done).
- Real path: a status on the order, changed on the seller's phone; the buyer seeing it live needs a shared
  app (`partTiers` none; the buyer's screen is tier `people`).
- Wave 6 options: add `style: "carrier"` (`carrier`, copyable `trackingNumber`, checkpoint timestamps, `proofPhoto`) and `style: "pickup"` (`pickupCode` via `KitCode`, bay/locker label, `"I'm here"` press).

### `Promo` · planned · content · phone
An offer as a tinted card: the headline ("20% off loaves today"), a code to copy, the end date, and an
optional photo.
- Pick: an offer or discount to notice. Not an urgent problem (`Banner`), not a headline fact (`Hero`).
- Writes: `title` text(36), `code` text(12) optional, `ends` date optional, `photo` optional, `goto`.
- Parts → actions: `code press` (copies), `root press`. · States: filled.
- Real path: an offer stored on the device; the code is checked at checkout.
- Wave 6 options: add optional `endsAt` (`HH:MM`) and `style: "countdown"`.

### `SizeGuide` · planned · data · phone
A garment or footwear measurement matrix comparing sizes across body dimensions with a centimetre or inch unit toggle. Below or above the matrix sit an optional model reference note and a fit-scale band showing whether the item runs small, true to size or large.
- Pick: comparing product dimensions and fit before picking a variant. Not selecting a SKU option (`VariantPicker`), plain key-value facts (`KeyValue`), or admin grids (data `Table`).
- Writes: `unit` (`cm`, `in`), `columns` text(12) each 2–6, `rows` of `size` text(10), `values` numbers matching `columns`, 2–10; `fitScore` number 1–5 optional (1 runs small, 3 true, 5 runs large), `modelNote` text(60) optional; `style`. Unit conversions between centimetres and inches are computed by code.
- Styles: `table` (default, measurement matrix with unit switch and fit scale), `fit` (compact fit-scale band and model reference note first).
- Parts → actions: `unit select`, rows `root select` (highlights a reference size).
- States: filled, empty, loading.
- Real path: measurement specifications stored with the product record on the device.
- Density: `meta.dense: true`, weight 3; size matrices compare up to ten sizes across six dimensions.

### `SavedList` · planned · content · phone
Saved shop items displaying each item's photo, current price beside the price when saved, a price-drop or low-stock badge and a target alert price. Shoppers can move an item into their basket in one tap, remove it or mark an item claimed when shared as a gift list.
- Pick: tracking shop items to buy later with price-drop badges and one-tap move to cart. Not an active basket (`Cart`), owned household stock (inventory `Things` / `Wishlist`), or wedding gift lists (events `Registry`).
- Writes: `items` of `id` text(24), `name` text(28), `photo` optional, `price` number, `savedPrice` number optional, `targetPrice` number optional, `stock` number optional, `claimed` boolean optional, `goto` optional, 1–12; `shared` boolean (default false); `style`. Price-drop deltas and low-stock flags are computed by code.
- Styles: `rows` (default, item rows with saved-price comparison and move-to-cart action), `grid` (two-column saved product cards).
- Parts → actions: items `root press`, items `move press`, items `alert set`, items `claim toggle`, items `remove press`. `meta.confirmParts: ["remove"]`; `meta.partTiers: { claim: "people" }`.
- States: filled, empty, loading, success (moved to basket or alert set), error (out of stock or save failed).
- Real path: saved product records stored on the device; shared gift claims require a shared app (`people`), and price-drop alerts require notifications or a watch service.
- Density: `meta.dense: true`, weight 3; saved lists hold up to 12 items with price-drop comparison.

## Archetypes (6)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `shop` | Browse what is for sale | `grid`, `menu`, `saved` | `grid`: Header, Search, Chips, Promo, ProductGrid, CartBar · `menu`: Header, Search, Chips, ProductGrid[menu], CartBar · `saved`: Header, SavedList, CartBar |
| `product` | One product | `simple`, `variants`, `sizing` | `simple`: Header[back], Gallery[carousel], Product, Scale[readonly] · `variants`: Header[back], Gallery[carousel], Product, VariantPicker, Scale[readonly] (the add bar stays pinned) · `sizing`: Header[back], SizeGuide, VariantPicker |
| `cart` | The basket | `simple` | Header, Cart, Button |
| `checkout` | Finish and follow an order | `pay`, `status` | `pay`: Header, Checkout, Note · `status`: Header, OrderStatus, OrderSummary |
| `orders` | Seller: orders coming in | `today`, `order` | `today`: Header, Segmented, Stats, List · `order`: Header[back], OrderStatus (seller), OrderSummary |
| `product_edit` | Seller: add or change a product | `form` | Header, Field[photo], Field ×3, Composer[entry], Button |

## Worked example: Crumb

A bakery taking next-day pre-orders. `shop/menu` lists loaves and pastries; a loaf has sizes
(`VariantPicker`); the basket holds three items; checkout offers pickup tomorrow, cash or card;
`OrderStatus` lights "Ready" in the morning. The baker's `orders/today` shows 23 orders and moves each to
"Ready". Signature: `count_up` on today's orders.

## Tiers

Card and wallet payments are `service` parts of `Checkout`. The seller's side works on the phone; the
buyer's side needs a shared app, which "what's real?" says plainly.

## Build notes

- Order: `ProductGrid`, `Product`, `Cart`, `CartBar`, `OrderSummary` (a working shop without payment), then
  `OrderStatus`, `VariantPicker`, `Promo`, `Checkout`, then Wave 6 additions `SizeGuide` and `SavedList`.
- Totals, tax and delivery are computed by code; the model writes item prices only.
- **Wave 6 additions & options:**
  - Added `SizeGuide` (`data`, `phone`) for garment/footwear measurement matrices with cm/in conversion and fit-scale band, and `SavedList` (`content`, `phone`) for tracked items, price-drop alerts, move-to-cart and optional shared claims.
  - Option/style upgrades: `OrderStatus` gains `style: "carrier"` (carrier, copyable `trackingNumber`, checkpoints, `proofPhoto`) and `style: "pickup"` (`pickupCode` via `KitCode`, bay/locker label, `"I'm here"` press); `ProductGrid` gains `style: "deals"` (`claimed` %, discount badge, countdown); `VariantPicker` gains `style: "shade"` (undertone/depth grouping); `Product` gains `aisle`, `storeName`, `storeStock`, `cleanTags` and `scan press` (`ok`); `Promo` gains `endsAt` and `style: "countdown"`. Product reviews rely on promoting `customers/Review` to Core.

## Open questions

- **Subscriptions (a weekly veg box)?** Default: `Choice` with `value` for the plan and `Field` kind
  `repeat` for the day; no new component.

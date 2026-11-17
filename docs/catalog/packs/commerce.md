# `commerce` pack

**Status:** revised · **Wave:** 3 · **Pick line:** Selling things for money: a shop, a bakery, a stall. Not
booking time (`booking`).

## Purpose

Goods on offer, a basket, an order and its progress. It covers small sellers (a bakery taking pre-orders, a
market stall, a maker selling prints) and the buyer's side of the same shop. Money is shown with the core
`Amount`; taking payment is always tier `service`.

## Apps it serves

Bakery or café pre-orders, market stall, maker or artist shop, school uniform swap with prices, farm box
subscriptions, restaurant takeaway menu, merch for a band or club, plant shop (with Ledge-style care).

## What the core already covers

- A price, a total, a struck-through old price: `Amount` (`inline`, `total`, `was`).
- Product photos: `Gallery` style `carousel`; star rating: `Scale` with `readonly`.
- Categories to filter: `Chips`; finding a product: `Search`; a shelf of "Popular": `List` style `shelf`.
- Order placed: `Success`; removing everything from the cart: `Button` with `confirm`.

The first plan's `Price` is now core `Amount`, and its `Quantity` is a part of `Product` and `Cart` (a
separate stepper component was a near miss with `Counter`).

## Components (9)

### `Product` · planned · content · phone
One product's page body: name, price (with an old price if on sale), a short description, stock
("Only 3 left"), a quantity stepper and an add-to-cart button, with a heart to save it.
- Pick: one item for sale, fully. Not a grid of items (`ProductGrid`), not a service with a duration
  (booking `ServiceMenu`).
- Writes: `name` text(32), `price` number, `was` number optional, `currency`, `description` text(240),
  `stock` number optional, `badge` text(12) optional, `qty` 1–99 (default 1), `saved` boolean.
- Parts → actions: `qty increment`/`decrement`, `add press`, `save toggle`.
- States: filled, loading, success (added). · Real path: product records on the device; selling needs a
  payment service at checkout. · Aliases: product page, item, product detail.

### `ProductGrid` · planned · content · phone
Products as a two-column grid of photo cards with name and price, a sale badge, and a quick add button; or
as menu rows (name, line, price, photo on the right) for food.
- Pick: browsing several things for sale. Not several pictures without prices (`Gallery`), not services
  (booking `ServiceMenu`).
- Writes: `items` of `name` text(28), `price` number, `was` optional, `photo`, `badge` text(12) optional,
  `sub` text(48) optional (menu), `goto`, 1–8; `currency`.
- Styles: `grid` (default), `menu`.
- Parts → actions: items `root press`, items `add press`. · States: filled, empty, loading.
- Real path: a product query on the device. · Aliases: products, shop, catalogue, menu, store.

### `VariantPicker` · planned · input · phone
The options of one product: colour swatches, size boxes or named choices, with unavailable ones crossed
out and the price change per option.
- Pick: choosing a size, colour or kind of one product. Not filtering many products (`Chips`), not
  choosing a plan (`Choice`).
- Writes: `label` text(16), `kind` (`swatch`, `size`, `named`), `options` of `label` text(16), `swatch`
  (accent name for swatches, never a hex), `available` boolean, `extra` number optional, 2–8; `at`.
- Parts → actions: items `root select`. · States: filled.
- Real path: variants stored with the product. · Aliases: size, colour, options, variants.

### `Cart` · planned · content · phone
The basket: one line per item with photo, name, variant, a quantity stepper and the line price; a promo
field; subtotal, delivery and total at the foot.
- Pick: what the person is about to buy. Not a placed order (`OrderSummary`), not a checklist of groceries
  to buy in a shop (kitchen `GroceryList`).
- Writes: `lines` of `name` text(28), `variant` text(20) optional, `photo`, `qty` 1–99, `price` number,
  1–8; `delivery` number optional, `currency`. Totals are computed by code.
- Parts → actions: items `qty increment`/`decrement`, items `remove press`, `promo type`.
- States: filled, empty, loading. · Real path: a basket kept on the device. · Aliases: basket, bag, cart.

### `CartBar` · planned · action · phone
A bar pinned to the bottom while shopping: item count, total and "View basket", only when the basket is not
empty.
- Pick: a way back to the basket while browsing. Not the screen's main action (`Button`), not the basket
  itself (`Cart`).
- Writes: `count` number, `total` number, `currency`, `goto`.
- Parts → actions: `root press`. · States: filled, empty (hidden). · Region: bottom.
- Real path: the basket's count and total on the device. · Aliases: basket bar, view cart, sticky cart.

### `Checkout` · planned · input · service
The last step: pickup or delivery, the time, the address, how to pay (card, cash on pickup) and the total,
with "Place order".
- Pick: finishing an order. Not reviewing a booking (booking `BookingSummary`), not the basket (`Cart`).
- Writes: `modes` subset of (`pickup`, `delivery`, `table`), `mode`, `time` text(20) optional, `address`
  text(60) optional, `methods` subset of (`card`, `cash`, `wallet`), `method`, `total` number, `currency`.
- Parts → actions: `mode select`, `method select`, `address press`, `place press` (`!needs-service`).
- States: filled, success. · Real path: a payment service takes the money; cash on pickup works offline.
- Aliases: checkout, pay, place order, payment.

### `OrderSummary` · planned · content · phone
A placed order as a receipt: number, date, items with quantities, totals, how it is being fulfilled and
where.
- Pick: what was ordered. Not the basket before ordering (`Cart`), not where it is now (`OrderStatus`).
- Writes: `number` text(12), `date`, `lines` of `name` text(28), `qty`, `price`, 1–8; `currency`,
  `mode` (`pickup`, `delivery`, `table`), `place` text(60) optional.
- Parts → actions: `reorder press`. · States: filled, loading.
- Real path: an order record on the device. · Aliases: receipt, order details, order.

### `OrderStatus` · planned · data · phone
Where an order is: steps (received, preparing, ready, collected or on its way, delivered) with the current
one lit and its time, and a short line ("Ready at 10:30").
- Pick: the progress of one order. Not a delivery on a map (places `DeliveryTracker`), not steps through a
  form (`Steps`).
- Writes: `steps` of `label` text(16), `time` optional, 3–5; `at` index; `line` text(48) optional.
- States: filled, success (done). · Real path: a status stored on the order, changed by the seller.
- Aliases: order tracking, order progress, status.

### `Promo` · planned · content · phone
An offer as a tinted card: the headline ("20% off loaves today"), a code to copy, the end date, and an
optional photo.
- Pick: an offer or discount to notice. Not an urgent problem (`Banner`), not a headline fact (`Hero`).
- Writes: `title` text(36), `code` text(12) optional, `ends` date optional, `photo` optional, `goto`.
- Parts → actions: `code press` (copies), `root press`. · States: filled.
- Real path: an offer stored on the device; checking the code happens at checkout.
- Aliases: offer, deal, coupon, discount, sale.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `shop` | Browse what is for sale | `grid`, `menu` | Header, Search, Chips, Promo, ProductGrid, CartBar |
| `product` | One product | `simple`, `variants` | Header[back], Gallery[carousel], Product, VariantPicker, Scale[readonly] |
| `cart` | The basket | `simple` | Header, Cart, Amount[total], Button |
| `checkout` | Finish and follow an order | `pay`, `status` | `pay`: Header, Checkout · `status`: Header, OrderStatus, OrderSummary |

## Worked example: Crumb

A bakery taking next-day pre-orders. `shop/menu` lists loaves and pastries with prices; a loaf has sizes
(`VariantPicker`); the basket shows three items and a pickup total; checkout offers pickup tomorrow and cash
or card; `OrderStatus` lights "Ready" in the morning. Signature: `count_up` on the order total.

## Aliases that shadow the core

With `commerce`: `products`, `menu`, `shop` → `ProductGrid` (otherwise `List`); `cart`, `basket` → `Cart`;
`receipt` → `OrderSummary`; `offer`, `coupon` → `Promo` (otherwise `Banner`).

## Tiers

`Checkout` is `service` (payments). Everything else works on the seller's phone; the buyer's side needs a
shared app, which "what's real?" says plainly.

## Build notes

- Order: `ProductGrid`, `Product`, `Cart`, `CartBar`, `OrderSummary` (a working shop without payment), then
  `OrderStatus`, `VariantPicker`, `Promo`, `Checkout`.
- Totals, tax and delivery are computed by code; the model writes item prices only.
- Swatches use accent names so themes stay in control of colour.

## Open questions

- **Subscriptions (a weekly veg box)?** Default: `Choice` with `value` for the plan, `Field` kind `repeat`
  for the day; no new component.

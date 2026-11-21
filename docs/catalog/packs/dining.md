# `dining` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Restaurants, cafés and QSR dining: calorie/allergen
menus, multi-group dish customizers, drive-thru/curbside check-in, party table booking, walk-in waitlists
and consumer points rewards. Not home cooking (`kitchen`), not retail (`commerce`).

## Purpose

Ordering, dining out, and earning loyalty rewards at restaurants, cafés, bakeries, and quick-service
chains: calorie- and allergen-tagged menus, deep multi-group meal/drink customization with counted add-ons
and split halves, drive-thru and curbside arrival check-in, party table bookings by seating zone, live
walk-in waitlists and timed surplus-food rescue pickups, and consumer-facing points catalogs. Carts,
checkouts, and kitchen prep steps come from `commerce`; delivery courier maps come from `places`; home
cooking stays in `kitchen`.

## Apps it serves

Quick-service restaurant mobile order & drive-thru app, specialty coffee rewards & drink builder, pizzeria
or bowl customizer, sit-down restaurant discovery & table reservation app, surplus food rescue pickup app.

## What the core already covers

- Carts, promos, checkout, order receipts, and kitchen preparation step tracks: `commerce` (`Cart`,
  `CartBar`, `Checkout`, `OrderSummary`, `OrderStatus`).
- Courier delivery tracking, restaurant addresses, and opening hours: `places` (`DeliveryTracker`,
  `Address`, `Hours`); live busyness hour bars: Core `Bars[active]`.
- Scannable loyalty/wallet QR codes at the register: Core `PassCard`.
- Dining reviews and rating breakdowns: Core `Review`; searching and filtering: `Search`, `Chips`,
  `FilterBar`.
- Home recipes, pantry expiry, grocery lists, and personal macro diaries: `kitchen`.
- Interactive drag-and-drop visual pizza-half canvases: Core `Canvas`.

`MenuBoard` stays for restaurant meal sections with calories and dietary/allergen tags; `DishCustomizer`
for multi-group modifiers, counted toppings, left/whole/right halves, and live calorie/price totals;
`PickupCheckIn` for drive-thru, curbside bay, counter, and table arrival check-in; `TableBooking` for
party size, seating zone, and reservation time slots; `DiningQueue` for walk-in wait quotes and surplus
rescue windows; and `RewardsWallet` for consumer points balances, tiers, and reward redemption.

## Components (6)

### `MenuBoard` · planned · content · phone
Restaurant or café menu grouped under meal-section headings (`Breakfast`, `Signature Bowls`, `Espresso`),
displaying each dish's thumbnail photo, name, price (`moneyLine`), calorie badge, dietary/allergen pills
(`GF`, `V`, `VG`, `DF`, `Spicy`, `Nuts`), greyed sold-out state, and a quick-add or customize trigger.
- Pick: browsing a restaurant or café menu with calories, dietary/allergen tags, and meal sections. Not
  retail store catalogs (commerce `ProductGrid`), not salon appointment menus (booking `ServiceMenu`), not
  home recipe ingredients (kitchen `Ingredients`).
- Writes: `sections` of `title` text(24), `items` of `itemId` text(24), `name` text(32), `price` number > 0,
  `calories` number 0–4000 optional, `tags` subset of (`GF`, `V`, `VG`, `DF`, `Spicy`, `Nuts`), `photo`
  optional, `soldOut` boolean (default false), `customizable` boolean (default false), `goto` (customizer
  screen), 1–6, 1–4; `style`. Code disables add/customize actions on sold-out items and formats item prices
  with `moneyLine` in the brief's currency.
- Styles: `sections` (default, meal section headings with horizontal photo rows), `cards` (featured
  two-column dish photo grid with calorie and dietary pills).
- Parts → actions: items `root press` (opens `goto`), items `add press` (available items without required
  customization).
- States: filled, empty, loading, error (menu unavailable).
- Real path: restaurant menu catalog stored on the device (`phone`), with live sold-out and price sync
  backed by a restaurant ordering service (`service`).
- Density: `meta.dense: true`, weight 3; grouped restaurant menus display up to 24 items across meal
  sections.

### `DishCustomizer` · planned · input · phone
Multi-group meal or beverage builder showing the item title, live computed calorie and price totals, required
single choices (`Size`, `Crust`, `Milk`), optional multi-select toppings, counted add-ons (`Syrup Pumps`,
`Extra Patties`), optional `Left / Whole / Right` portion split pills, and a preparation note field above
the Add/Save bar.
- Pick: customizing a restaurant meal or drink with modifier groups, counted add-ons, portion splits, and
  calorie/price deltas. Not SKU color/size swatches (commerce `VariantPicker`), not generic form fields
  (`Field`), not daily food logs (kitchen `FoodLog`).
- Writes: `name` text(32), `basePrice` number ≥ 0, `baseCalories` number 0–4000 optional, `groups` of
  `groupId` text(20), `title` text(24), `mode` (`single`, `multi`, `count`), `required` boolean (default
  false), `maxCount` number 1–10 optional, `allowSplit` boolean (default false), `options` of `optId`
  text(20), `label` text(24), `extraPrice` number (signed) optional, `deltaCalories` number (signed)
  optional, `selected` boolean (default false), `count` number 0–10 (default 0), `split` (`whole`, `left`,
  `right`) optional, 1–8, 1–6; `note` text(80) optional, `style`. Live total price, live calorie count, and
  required-group validation are computed by code.
- Styles: `builder` (default, stacked modifier groups with live totals footer), `compact` (condensed
  accordion-style groups).
- Parts → actions: options `root select` (`single` mode), options `root toggle` (`multi` mode), options
  `qty increment`, options `qty decrement` (`count` mode), options `split select`, `note type`, `add press`
  (enabled once all required groups are filled).
- States: filled, loading, success (dish added to order), error (required modifier missing).
- Real path: item modifier rules, counts, and calorie/price deltas bundled on the device (`phone`).
- Density: `meta.dense: true`, weight 3; dish customizers span up to 6 modifier groups of 8 options each.

### `PickupCheckIn` · planned · action · ok
Arrival check-in card for a mobile restaurant order displaying a prominent 4-character pickup code
(`KitCode`), selectable pickup channel tabs (`Drive-Thru`, `Curbside`, `Counter`, `Table #`), conditional
curbside bay/car note or table-number input, an `I'm here` check-in button, and a scannable handoff code
once checked in.
- Pick: confirming customer arrival at a drive-thru lane, curbside bay, pickup counter, or dine-in table.
  Not kitchen preparation progress (commerce `OrderStatus`), not delivery courier maps (places
  `DeliveryTracker`), not event gate scanning (events `Door`).
- Writes: `orderCode` text(8), `venue` text(32), `channels` subset of (`drive_thru`, `curbside`, `counter`,
  `table`), `channel` (`drive_thru`, `curbside`, `counter`, `table`), `bayOrTable` text(12) optional,
  `carNote` text(24) optional, `checkedIn` boolean (default false), `handoffCode` text(16) optional,
  `style`. Code requires a bay or table entry when `curbside` or `table` is selected before enabling check-in.
- Styles: `checkin` (default, pickup code, channel picker, bay/car inputs, and `I'm here` button),
  `handoff` (scannable handoff pass and bay badge after arrival).
- Parts → actions: `channel select`, `bay type`, `car type`, `arrive press`.
  `meta.partTiers: { arrive: "service" }`.
- States: filled, loading, success (kitchen notified of arrival), error (outside restaurant geofence or
  order not ready).
- Real path: uses device location geofencing (`ok`) to detect arrival and notifies the store's POS/kitchen
  display via an ordering service (`service`).

### `TableBooking` · planned · input · service
Restaurant reservation selector pairing a party-size stepper (`1–12 guests`), date picker, seating-zone
chips (`Indoor`, `Patio`, `Bar`, `Booth`), an interactive time-slot grid (`KitSlotGrid`) separating open
tables from taken slots, and optional occasion or allergy note fields before confirming.
- Pick: reserving a restaurant table by party size, date, seating zone, and open dining slot. Not 1-on-1
  provider appointments (booking `Slots`), not wedding seating charts (events `Seating`), not walk-in
  waitlists (`DiningQueue`).
- Writes: `venue` text(32), `partySize` number 1–12 (default 2), `date`, `zones` subset of (`indoor`,
  `patio`, `bar`, `booth`), `zone` (`indoor`, `patio`, `bar`, `booth`), `times` of `time` HH:MM, `taken`
  boolean, `sub` text(16) optional, 1–16; `at` HH:MM optional, `occasion` (`none`, `birthday`,
  `anniversary`, `business`) optional, `note` text(80) optional, `style`. Code disables taken slots and
  prevents confirming without an open time selection.
- Styles: `picker` (default, party stepper, date, zone chips, and time slot grid), `confirm` (selected
  table details with occasion/allergy note and confirm trigger).
- Parts → actions: `party increment`, `party decrement`, `date set`, `zone select`, times `root select`
  (open only), `occasion select`, `note type`, `book press`.
- States: filled, empty (no open tables for party size), loading, success (table booked), error (slot no
  longer available).
- Real path: live table-management inventory and reservation confirmation via a dining booking service
  (`service`).

### `DiningQueue` · planned · data · service
Live walk-in restaurant waitlist and timed surplus-food rescue board displaying either live quoted wait
times ("15–25 min"), parties ahead, party-size stepper, and Join/Leave waitlist controls, OR timed
surplus-bag pickup windows ("21:00–21:30 · 3 left") with bag price and Reserve/Cancel actions.
- Pick: joining a walk-in restaurant waitlist or claiming a timed surplus-food rescue bag window. Not
  fitness class waitlists (booking `Waitlist`), not advance table reservations (`TableBooking`), not service
  ticket queues (requests `RequestQueue`).
- Writes: `venue` text(32), `mode` (`waitlist`, `rescue`), `waitMin` number 0–180 optional, `waitMax`
  number ≥ `waitMin` optional, `partiesAhead` number ≥ 0 optional, `partySize` number 1–12 optional,
  `joined` boolean (default false), `windowLabel` text(24) optional, `bagsLeft` number 0–50 optional,
  `bagPrice` number > 0 optional, `reserved` boolean (default false), `style`. Rescue prices format with
  `moneyLine`; code disables claiming when `bagsLeft === 0`.
- Styles: `waitlist` (default, wait quote, parties ahead, party size, and Join/Leave controls), `rescue`
  (surplus window, bags left, price, and Reserve/Cancel actions).
- Parts → actions: `party increment`, `party decrement`, `join press`, `leave press`, `reserve press`,
  `cancel press`. `meta.confirmParts: ["leave", "cancel"]`.
- States: filled, empty (waitlist closed or bags sold out), loading, success (joined queue or bag reserved),
  error.
- Real path: real-time host-stand waitlist and surplus bag counts backed by a dining service (`service`),
  with table-ready SMS/push alerts (`ok`).

### `RewardsWallet` · planned · data · phone
Consumer loyalty wallet displaying points balance, tier-progress meter ("Gold · 240 pts to Platinum"),
bonus challenge pills, and a redeemable reward catalog grouped by points cost (`150 pts Espresso`, `300 pts
Pastry`, `600 pts Entrée`) with Redeem triggers (pairs alongside core `PassCard` at the register).
- Pick: viewing a consumer's points balance, tier progress, and redeemable rewards at restaurants, cafés,
  or loyalty retailers. Not merchant-side client stamp cards (customers `Loyalty`), not single promo codes
  (commerce `Promo`), not the scannable checkout barcode card itself (`PassCard`).
- Writes: `programName` text(28), `points` number ≥ 0, `tier` text(16), `nextTier` text(16) optional,
  `nextTierAt` number > 0 optional, `challenges` of `label` text(28), `bonus` text(12), `done` boolean, 0–3;
  `rewards` of `rewardId` text(24), `title` text(32), `cost` number > 0, `photo` optional, 1–6; `style`.
  Remaining points to next tier and affordable rewards (`points >= cost`) are computed by code; redeeming
  subtracts points and issues a voucher code.
- Styles: `catalog` (default, balance header, tier meter, challenges, and reward rows), `compact` (balance,
  tier progress, and top 2 redeemable rewards).
- Parts → actions: rewards `redeem press` (enabled when `points >= cost`), `scan press` (links to
  `PassCard` screen). `meta.partTiers: { redeem: "service" }`.
- States: filled, empty, loading, success (reward redeemed), error (redemption failed).
- Real path: cached points balance and reward tiers stored locally on the device (`phone`); redeeming a
  reward validates balance and mints a single-use voucher via a loyalty service (`service`).

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `dining_menu` | Browse calorie/allergen menus and customize meals or drinks | `dining_menu`, `dining_customize` | `dining_menu`: Header, Search, Chips, MenuBoard, Note · `dining_customize`: Header[back], DishCustomizer, Note, Button |
| `qsr_pickup` | Earn/redeem consumer points rewards and check in at pickup bays | `dining_rewards`, `dining_checkin` | `dining_rewards`: Header, PassCard, RewardsWallet, Note · `dining_checkin`: Header[back], PickupCheckIn, KeyValue, Note |
| `dine_in` | Book a dining table or join a walk-in waitlist or rescue window | `dining_reserve`, `dining_waitlist`, `dining_rescue` | `dining_reserve`: Header[back], TableBooking, Note, Button · `dining_waitlist`: Header, Search, DiningQueue[waitlist], Note · `dining_rescue`: Header, Chips, DiningQueue[rescue], Note |
| `food_delivery` | Discover restaurant dishes and track active pickup handoffs | `dining_discover`, `dining_track` | `dining_discover`: Header, FilterBar, MenuBoard[cards], Note · `dining_track`: Header[back], Steps, PickupCheckIn[handoff], KeyValue, Note |

Each archetype's `defaultLayout` is its first listed layout; all layout ids are `dining_`-prefixed and
unique. Recipes use only core (including wave 6 core `PassCard` and `FilterBar`) plus `dining`, stay
within weight 7, and keep at most one weight-3 dense block per screen.

## Worked example: Ember Roasters & Table (café ordering & dining)

A neighborhood café and bistro app lets regulars browse `dining_menu/dining_menu` (`MenuBoard`) filtered
by `GF` and `VG` dietary tags, tap an Oat Cortado to customize milk, espresso shots, and syrup pumps in
`DishCustomizer` (`dining_customize`), and tap "I'm here · Curbside Bay 3" on `PickupCheckIn`
(`qsr_pickup/dining_checkin`). Weekend dinner guests reserve a Friday patio table for 4 on
`dine_in/dining_reserve` (`TableBooking`), walk-ins see a "15–25 min" quote on `dine_in/dining_waitlist`,
surplus bags appear on `dine_in/dining_rescue`, and regulars earn points toward a free pastry on
`qsr_pickup/dining_rewards` pairing `PassCard` with `RewardsWallet`. Signature: `check_burst` on arrival
check-in or `count_up` on points balance.

## Tiers

`MenuBoard`, `DishCustomizer`, and viewing `RewardsWallet` work on the `phone`. `PickupCheckIn` uses
geofence location (`ok`) and notifies the kitchen (`service`). `TableBooking`, `DiningQueue`, and
redeeming rewards on `RewardsWallet` require a dining or loyalty `service`.

## Build notes

- Order: `MenuBoard`, `DishCustomizer`, `PickupCheckIn`, `TableBooking`, `DiningQueue`, `RewardsWallet`.
- Reuse `KitCode`, `KitSlotGrid`, `KitStepper`, `KitMeter`, `KitOption`, and `KitChip`; no new kit base or
  signature is needed.
- Prices format via `moneyLine` under the brief's currency; calories stay plain integers without invented
  macro formulas.
- Pair `dining` with `commerce` when the app needs a multi-item cart, checkout, and order status steps,
  and with `places` for delivery tracking and hours.

## Open questions

- **New actions?** None. Customizations, check-ins, table bookings, queue joins/leaves, and redemptions
  use `select`, `toggle`, `increment`, `decrement`, `type`, `set`, and `press`.
- **Visual pizza-half drag canvas?** Keep continuous draggable topping placement in core `Canvas`; use
  `DishCustomizer` `allowSplit` (`left`, `whole`, `right`) for structured half-and-half ordering.

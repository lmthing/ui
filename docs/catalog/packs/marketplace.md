# `marketplace` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Peer-to-peer resale, timed/live auctions, price
negotiations, bundle boxes, live drops and shipping labels. Not fixed-price retail carts (`commerce`),
not cars (`auto`).

## Purpose

Peer-to-peer consumer resale, competitive timed and sudden-death auctions, structured price negotiation
threads, live-hosted shopping drop rooms, single-seller closet bundle discounting, and peer drop-off shipping
labels. It serves C2C secondhand marketplaces and live-drop sellers, not fixed-price retail storefronts,
vehicle dealerships, or primary event-ticket sales.

## Apps it serves

Secondhand wardrobe resale marketplace, live collectible drop auction room, vintage goods negotiation app,
peer seller bundle and shipping companion.

## What the core already covers

- Browsing and filtering listings: `Search`, `FilterBar`, `Chips`, `List[cards]`.
- Listing photos and specifics: `Gallery[carousel]`, `KeyValue`, `Photo`; seller reputation: `Profile`, `Review`.
- Headline prices: `Amount`; general buyer-seller messaging: `Bubbles` + `Composer[reply]`; quick keeps: `SwipeStack`.

`Auction` adds competitive bid increments, reserve status, live countdowns, and binding max bids; `OfferThread`
renders structured accept/counter/decline price cards; `LiveDrop` pairs a live drop stream frame with a
pinned lot and instant bid/buy controls; `BundleBox` computes tiered closet discounts and combined parcel
weight tiers; `ShippingLabel` issues carrier labels and drop-off QR codes (`KitCode`).

## Components (5)

### `Auction` · planned · action · service
Timed or sudden-death auction panel showing lot title, thumbnail, current highest bid, bid count, reserve
met/unmet status pill, live countdown clock, one-tap quick-bid and custom max-bid controls, and up to six
recent anonymized bid rows. Code computes minimum next bid from current bid plus increment and locks bidding
once the countdown expires.
- Pick: bidding on a competitive listing with bid increments, reserve status, and live countdowns. Not
  fixed-price retail goods (`commerce/Product`), plain timers (`Timer`), or live stream rooms (`LiveDrop`).
- Writes: `lotId` text(24), `title` text(36), `photo` optional, `currentBid` number ≥ 0, `minIncrement` number
  > 0, `reserveMet` boolean (default true), `bidCount` int 0–9999, `endsAt` ISO datetime with offset,
  `suddenDeath` boolean (default false), `myMaxBid` number ≥ 0 optional, `bids` of `bidder` text(16),
  `amount` number > 0, `at` ISO datetime with offset, 0–6, `style`. Minimum next bid, leading/outbid badge,
  and remaining countdown are computed by code.
- Styles: `lot` (default, full bid panel with quick-bid, custom max-bid, and recent bid rows), `compact`
  (condensed live bid card with quick-bid trigger).
- Parts → actions: `quickbid press`, `maxbid set` (number ≥ minimum next bid), `submit press`, `watch toggle`.
  `meta.confirmParts: ["submit"]`.
- States: filled (live bidding), empty (no bids yet; displays starting bid), loading (placing bid), success
  (leading bid confirmed), error (outbid or auction closed).
- Real path: synchronized auction ledger on the marketplace service using `moneyLine` and the brief's
  currency; confirmed bids commit atomically server-side.

### `OfferThread` · planned · content · people
Structured buyer–seller price negotiation cards inside a deal thread, showing item thumbnail, title, asking
price, offered price, expiration time, sender role (`buyer` or `seller`), and Accept, Counter, or Decline
controls. Pending offers confirm before accepting or declining; accepted, declined, or expired cards stay
visible as read-only history.
- Pick: negotiating item prices between a buyer and seller with accept/counter/decline cards. Not plain text
  chat (`Bubbles`), support tickets (`requests/RequestThread`), or job offers (`hiring/Offer`).
- Writes: `threadId` text(24), `itemTitle` text(32), `itemPhoto` optional, `askingPrice` number > 0,
  `viewerRole` (`buyer`, `seller`), `offers` of `offerId` text(24), `from` (`buyer`, `seller`), `amount`
  number > 0, `note` text(80) optional, `expiresAt` ISO datetime with offset, `status` (`pending`, `accepted`,
  `declined`, `countered`, `expired`), 1–6; `counterAmount` number > 0 optional; `style`. Discount %, expiry,
  and whose turn to respond are computed by code.
- Styles: `thread` (default, chronological offer cards with active counter input), `card` (single latest
  active offer card).
- Parts → actions: offers `accept press`, offers `decline press`, `counter set` (number > 0), `send press`.
  `meta.confirmParts: ["accept", "decline"]`.
- States: filled, empty (no offers exchanged yet), loading, success (offer accepted or counter sent), error
  (offer expired or invalid amount).
- Real path: buyer-seller offer records synced through a marketplace negotiation service (`people` tier for
  counterparty actions, escalating to payment service on acceptance).

### `LiveDrop` · planned · content · service
Live shopping show room and preview card linking a live stream frame to a pinned active lot, host name and
avatar, viewer count, up to four live chat snippets, and instant Bid or Buy Now controls. Real-time video
rendering stays in the host media/WebRTC surface (`Canvas`), while declarative controls drive bidding, buying,
following, and chat.
- Pick: participating in a live-hosted shopping drop with a pinned lot and instant bid or buy controls. Not
  static recorded video (`Player`), retail promo cards (`commerce/Promo`), or audio stages (`social/LiveRoom`).
- Writes: `showId` text(24), `hostName` text(24), `hostPhoto` optional, `title` text(36), `live` boolean
  (default true), `viewers` int 0–99999, `pinnedLot` of `lotId` text(24), `name` text(32), `photo` optional,
  `mode` (`auction`, `buy_now`), `price` number > 0, `endsAt` ISO datetime with offset optional (`auction`
  mode), `chat` of `sender` text(16), `text` text(80), 0–4, `style`. Next bid increment and lot countdown are
  computed by code.
- Styles: `room` (default, stream frame, pinned lot dock, live chat snippets, and action bar), `card`
  (discovery preview card for browsing live shows).
- Parts → actions: `enter press`, `bid press` (`auction` mode), `buy press` (`buy_now` mode), `follow toggle`,
  `chat type`, `send press`. `meta.confirmParts: ["buy"]`; `meta.partTiers: { send: "people" }`.
- States: filled (live stream and lot active), empty (scheduled / waiting for host), loading, success (lot
  purchased or high bid held), error (stream dropped or lot sold out).
- Real path: live lot pricing and chat events synced with a live-commerce service; native video codecs render
  inside the host frame while purchases and bids execute server-side.

### `BundleBox` · planned · input · phone
Multi-item C2C closet bundle builder grouping two to six single-unit seller listings alongside tiered seller
bundle discounts (such as 10% off 2+, 15% off 3+) and combined parcel weight bracket. Toggling items in or out
updates included count, active discount percentage, savings, net bundle price, and parcel weight tier live.
- Pick: bundling single-unit peer seller listings to compute tiered closet discounts and shipping weight. Not
  multi-quantity retail shopping carts (`commerce/Cart`), wishlists (`inventory/Wishlist`), or physical storage
  (`inventory/Storage`).
- Writes: `sellerName` text(24), `items` of `itemId` text(24), `title` text(28), `photo` optional, `price`
  number > 0, `weightGrams` int 10–20000, `included` boolean (default true), 2–6, `tiers` of `minItems` int
  2–6, `discountPct` int 1–50, 1–3, `checkoutGoto` optional, `style`. Code computes included count, unlocked
  discount %, subtotal, savings, final price, and weight bracket.
- Styles: `builder` (default, toggleable items, tier progress meter, and computed bundle totals), `summary`
  (locked bundle card before offer or checkout).
- Parts → actions: items `include toggle`, items `remove press`, `offer press` (opens `checkoutGoto`),
  `checkout press` (opens `checkoutGoto`). `meta.confirmParts: ["remove"]`.
- States: filled, empty (fewer than two items in bundle), loading, success (bundle ready), error (bundled
  item sold elsewhere).
- Real path: local bundle math over single-unit peer listings; submitting an offer or buying routes to
  `OfferThread` or marketplace checkout.

### `ShippingLabel` · planned · action · service
Peer-seller fulfillment card for choosing parcel size/weight tier and carrier rate, reviewing the buyer's
destination summary, generating a scannable drop-off QR code (`KitCode`), and copying the tracking code.
Generating locks parcel selection and reveals the QR pass; voiding an unused label confirms first.
- Pick: choosing parcel tiers, issuing a C2C drop-off QR label, and copying tracking numbers. Not buyer
  delivery maps (`places/DeliveryTracker`), retail order trackers (`commerce/OrderStatus`), or event tickets
  (`events/Ticket`).
- Writes: `orderId` text(24), `itemTitle` text(32), `buyerSummary` text(36), `destinationCity` text(28),
  `weightTier` (`under_500g`, `under_1kg`, `under_2kg`, `under_5kg`), `carriers` of `id` text(16), `name`
  text(24), `cost` number ≥ 0, `estDays` text(12), 1–4, `selectedCarrier` text(16) optional, `trackingCode`
  text(32) optional, `qrPayload` text(120) optional (host-issued), `status` (`draft`, `issued`,
  `dropped_off`, `voided`), `style`. Total shipping cost and QR visibility follow from `status` and selection.
- Styles: `label` (default, parcel tier selector, carrier options, generate CTA), `dropoff` (issued QR pass
  and tracking summary).
- Parts → actions: `weight select`, carriers `root select`, `generate press` (`draft` only), `tracking copy`,
  `void press` (`issued` only). `meta.confirmParts: ["void"]`.
- States: filled (draft or issued), empty, loading (issuing label), success (label QR issued), error (carrier
  label service failed).
- Real path: parcel tier and carrier selection commit through a shipping-label API returning a real carrier
  QR payload rendered by `KitCode` and tracking id.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `auction_lot` | Bid on a competitive timed auction | `marketplace_lot`, `marketplace_browse` | `marketplace_lot`: Header[back], Gallery[carousel], Auction, KeyValue · `marketplace_browse`: Header, FilterBar, List[cards], Button |
| `negotiation` | Negotiate peer resale prices | `marketplace_offers` | `marketplace_offers`: Header[back], OfferThread, Note |
| `live_show` | Watch live shopping drops and bid | `marketplace_drop` | `marketplace_drop`: Header[back], LiveDrop, Note |
| `seller_ship` | Bundle closet items and issue shipping labels | `marketplace_bundle`, `marketplace_label` | `marketplace_bundle`: Header[back], BundleBox, Note, Button · `marketplace_label`: Header[back], ShippingLabel, KeyValue |

Defaults: `auction_lot/marketplace_lot`, `negotiation/marketplace_offers`, `live_show/marketplace_drop`,
`seller_ship/marketplace_bundle`. Layout ids are `marketplace_`-prefixed and unique across the catalog.
Recipes use only core plus `marketplace` and stay within weight 12.

## Worked example: VintLoop

A C2C resale, live collectible drop, and closet-bundle app, separate from Ledge and Trot. On
`auction_lot/marketplace_browse`, Core `FilterBar` narrows vintage jackets to `List[cards]`; tapping Make
Offer opens `negotiation/marketplace_offers` where `OfferThread` negotiates 68 against an asking price of 80
with a 24-hour expiry. On `auction_lot/marketplace_lot`, `Auction` tracks a sudden-death lot at 140 with a
5-unit increment and 38s remaining, while `live_show/marketplace_drop` hosts a live seller room with a pinned
item. Sellers pack three listings into `seller_ship/marketplace_bundle` for an automatic 15% `BundleBox`
discount, then issue a 1kg carrier QR pass on `marketplace_label` via `ShippingLabel` (`KitCode`). Signature:
core `card_swipe` when pairing a discovery swipe deck, or ordinary tactile feedback across auction/offer actions.

## Tiers

`BundleBox` works locally on the phone. `OfferThread` and `LiveDrop.send` are `people` (`!needs-people`),
while `Auction`, `LiveDrop`, and `ShippingLabel` require marketplace/carrier `service` integration
(`!needs-service`). No payment credentials enter model props; monetary checkout stays host-owned.

## Build notes

- Order: `OfferThread`, `BundleBox`, `Auction`, `ShippingLabel`, `LiveDrop`; all remain planned.
- All drawings compose existing kit bases (`KitCard`, `KitRow`, `KitPhoto`, `KitInput`, `KitCheck`, `KitMeter`,
  `KitBubble`, `KitTrack`, `KitChip`, `KitTime`, `KitTrail`, `KitCode`, `KitAction`); no new wave-6 kit base
  is required.
- Writers use strict `writerFormat(registry)` for core plus selected packs only; no aliases or off-pack ids.
  Money values are numbers formatted via `moneyLine`; never write computed discount %, bundle savings,
  minimum next bids, or countdown durations.
- Real-time 60fps WebRTC video decoding in `LiveDrop` stays in the native/host stream frame (`Canvas`/player
  adapter), never simulated in declarative JSON.
- Every component is weight 2 and caps lists at 6 items; binding/destructive actions (`Auction.submit`,
  `OfferThread.accept/decline`, `LiveDrop.buy`, `BundleBox.remove`, `ShippingLabel.void`) use `meta.confirmParts`.

## Open questions

- **New action names?** None. Quick-bid, submit, accept, decline, send, enter, bid, buy, offer, checkout,
  generate, and void use `press`; tracking clipboard uses `copy`; counters/max-bids use `set`; chat uses `type`;
  inclusions/follows/watches use `toggle`; weights and carriers use `select`.
- **Seller payout wallets and escrow?** Default: combine optionally with `money` (`AccountCard`) or
  `commerce` (`OrderSummary`) at app level; never duplicate payout ledgers inside `marketplace`.
- **Auction signature?** Default: none proposed; keep timers and bids crisp and legible under reduced motion.

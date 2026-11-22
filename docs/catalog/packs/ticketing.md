# `ticketing` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Discovering, buying, reselling and presenting live event tickets: discovery cards, venue price tiers, deal-scored seat listings, ticket wallets and resale. Not organizing your own gathering (`events`), not retail carts (`commerce`).

## Purpose

Discovering live concerts, sports games, theater and comedy shows, comparing seating price tiers and deal-scored seat listings, holding scannable mobile passes on event day, and pricing owned tickets for secondary resale. The pack serves primary and secondary ticket marketplaces from the attendee and reseller perspective, not DIY event organizing or physical merchandise retail.

## Apps it serves

Concert and festival ticket marketplace, sports and theater seat finder, last-minute ticket app, mobile pass wallet, secondary ticket resale desk, stadium showtime and venue entry guide.

## What the core already covers

- Searching and narrowing events by city, date, category or price: `FilterBar`, `Search`, `Chips`.
- Venue locations and directions: `MapPins`; countdown to showtime: `Timer[until]`; multi-stage set times: `Timeline`.
- Featured headliner card: `Hero[photo]`; venue facts: `KeyValue`; attendee FAQ: `List[expand]`; venue reviews: `Review`.
- Generic membership/loyalty barcodes: `PassCard`; simple checkout confirmation: `KeyValue`, `Amount`, `Choice`, `Button` (or `commerce` for full shopping carts).
- Organising your own private party, guest RSVPs and banquet seating: `events` pack (a separate neighbour, never a dependency).

`EventDiscovery` stays for date-blocked live-event cards with starting price and low-inventory signals, not generic posts or local cafes. `PriceTiers` maps venue zones (Floor, Lower Bowl, Club, Upper) with live seat counts and price ranges, while `SeatListings` adds section/row details, 1–10 Deal Scores, seat-view photos, restricted-view notices and an all-in fee toggle. `TicketWallet` handles gate/section/row/seat headers, rotating entry codes and Transfer/Sell actions; `ResaleListing` computes marketplace seller fees and net payout against live market floors; `VenueGuide` gathers door times, bag/entry rules and seat views. Zoomable 60fps vector stadium seat maps remain `Canvas`.

## Components (6)

### `EventDiscovery` · planned · content · service
Live concerts, sports, theater and festival events as browsable cards or rows with a date block, photo, title, venue, city distance, starting "From" price, low-inventory pill and favorite toggle. Selecting an event opens its venue inventory; favoriting saves it locally.
- Pick: browsing ticketed live events to attend. Not club or community RSVPs (social `EventCard`), local venues (places `PlaceCard`), or private invitations (events `RSVP`).
- Writes: `events` of `eventId` text(32), `title` text(40), `date`, `time` HH:MM, `venue` text(32), `city` text(24), `photo` optional, `minPrice` number ≥ 0, `remaining` integer ≥ 0 optional, `saved` boolean (default false), `goto` optional, 1–6; `style`. Distance and low-inventory pills are computed from location and remaining count; prices format with `moneyLine` in the brief's currency.
- Styles: `cards` (default, photo cards with date block), `rows` (compact date-leading event rows).
- Parts → actions: items `root press` (linked), items `save toggle`.
- States: filled, empty, loading, error (catalog unavailable).
- Real path: event feed synced from a ticketing marketplace service; city distance optionally uses location permission (`ok`).

### `PriceTiers` · planned · input · service
Venue seating zones such as Floor, Lower Bowl, Club and Upper presented with color-coded section swatches, remaining ticket counts and min–max price ranges. Selecting an available zone filters matching seat listings; sold-out tiers disable selection.
- Pick: filtering live-event inventory by venue seating tier and price band. Not physical product variants (commerce `VariantPicker`), banquet tables (events `Seating`), or cinema rows (watch `SeatPicker`).
- Writes: `eventId` text(32), `tiers` of `tierId` text(24), `label` text(24), `swatch` (closed swatch enum), `available` integer ≥ 0, `minPrice` number ≥ 0, `maxPrice` number ≥ 0, 2–6; `selected` text(24) optional; `style`. Total remaining inventory and formatted price ranges are computed; zero-availability tiers disable selection.
- Styles: `rows` (default, tier rows with availability and price bounds), `zones` (color-coded zone chips above tier summary).
- Parts → actions: tiers `root select`, `clear press` (resets active tier filter).
- States: filled, empty, loading.
- Real path: tier availability and price bounds queried from live event inventory; selecting a tier filters the active listing query.

### `SeatListings` · planned · input · service
Marketplace seat listings for one event showing section, row, ticket quantity, a 1–10 Deal Score pill, seat-view thumbnail, restricted-view warning mark when present, instant-delivery badge and price with an all-in fees toggle. Selecting a listing opens seat-view details or starts checkout.
- Pick: comparing marketplace ticket offers by section, row, deal score and all-in price. Not retail catalogs (commerce `ProductGrid`), broad venue zones (`PriceTiers`), or guest RSVPs (events `GuestList`).
- Writes: `eventId` text(32), `allIn` boolean (default true), `listings` of `listingId` text(32), `section` text(20), `row` text(8), `quantity` integer 1–8, `basePrice` number ≥ 0, `fee` number ≥ 0, `dealScore` integer 1–10 optional, `viewPhoto` photo optional, `restrictedView` boolean (default false), `instant` boolean (default true), `goto` optional, 1–6; `style`. Displayed per-ticket and group prices (base vs base + fee) are computed from `allIn`.
- Styles: `rows` (default, compact seat rows with deal pills and view thumbnail), `cards` (larger cards emphasizing seat-view photos).
- Parts → actions: `allIn toggle`, listings `root press` (linked), listings `view press` (inspects seat view).
- States: filled, empty, loading, error (listing sold out or hold expired).
- Real path: live primary and secondary ticket offers fetched from a marketplace service; picking a listing holds seats briefly for checkout.
- Renderer: use the List row/card recipe for offers. `SeatPlan` is for seat geometry, not a list of offers.

### `TicketWallet` · planned · content · phone
Purchased live-event passes drawn as perforated tickets with event name, date, time, venue, gate, section, row and seat header, paired with a scannable entry barcode/QR and Transfer or Sell buttons. Rotating anti-fraud barcodes display live refresh status; past or scanned passes mark as used.
- Pick: holding, presenting, transferring or reselling purchased live-event passes. Not DIY organiser passes (events `Ticket`), flight or rail passes (trips `Reservation`), or loyalty barcodes (`PassCard`).
- Writes: `passes` of `passId` text(32), `event` text(40), `date`, `time` HH:MM, `venue` text(32), `gate` text(12) optional, `section` text(16), `row` text(8), `seat` text(12), `barcode` text(64) optional, `rotating` boolean (default false), `used` boolean (default false), `transferable` boolean (default true), `resaleGoto` optional, 1–6; `style`. Active vs used state and barcode availability are computed; missing barcodes show an unavailable notice, never invented codes.
- Styles: `pass` (default, full perforated pass with scannable code), `compact` (summary rows for multiple upcoming passes).
- Parts → actions: passes `root press`, passes `refresh press` (rotating barcodes only), passes `transfer press`, passes `sell press` (to `resaleGoto`). `meta.partTiers: { refresh: "service", transfer: "people", sell: "service" }`; `meta.confirmParts: ["transfer"]`.
- States: filled, empty, loading, success (pass transferred), error (offline barcode refresh or transfer failed).
- Real path: purchased passes cached locally on the phone for gate entry; rotating tokens refresh via the issuer service and transfers deliver to another attendee.

### `ResaleListing` · planned · input · service
Secondary resale desk for owned tickets: displays the selected section, row and seat numbers, live market floor comparison, editable ask price per ticket, code-computed seller fee and net payout, and an active/paused listing toggle. Sold listings lock edits and show payout status.
- Pick: pricing and listing owned event tickets for secondary resale. Not buyer checkout (commerce `Checkout`), supplier invoices (events `Vendors`), or retail inventory (commerce `Product`).
- Writes: `passId` text(32), `event` text(40), `section` text(16), `row` text(8), `seats` text(24), `quantity` integer 1–8, `marketFloor` number ≥ 0 optional, `askPrice` number > 0, `feeRate` number 0–0.5, `status` (`draft`, `active`, `paused`, `sold`), `style`. Seller fee, net payout per ticket, total payout and market-floor delta are computed; never write formatted payout totals.
- Styles: `form` (default, editable ask price and payout breakdown), `summary` (live active or sold listing card).
- Parts → actions: `ask set` (number > 0), `active toggle` (active vs paused), `publish press`, `cancel press` (withdraws resale listing). `meta.confirmParts: ["cancel"]`.
- States: filled, loading, success (listing published or updated), error (invalid ask price or marketplace rejected listing).
- Real path: verifies ticket ownership against the marketplace and publishes, pauses or withdraws the resale offer via the ticketing service.

### `VenueGuide` · planned · content · phone
Event-day venue logistics: doors-open time versus showtime, bag and entry policy pills (such as clear-bag or mobile-only entry), parking and transit notes, and a horizontal strip of section seat-view photos.
- Pick: attendee entry rules, door times and seat views for one live event. Not weekly store hours (places `Hours`), street address alone (places `Address`), or multi-day trips (trips `Itinerary`).
- Writes: `venue` text(32), `doorsAt` HH:MM, `showAt` HH:MM, `policies` of `label` text(24), `tone` (`neutral`, `warn`), 1–6; `transitNote` text(160) optional, `parkingNote` text(120) optional, `seatViews` of `section` text(16), `photo`, 0–6; `style`. Wait interval between doors and showtime is computed.
- Styles: `guide` (default, times, entry policies, transit notes and seat views), `compact` (door time and entry policy pills only).
- Parts → actions: seatViews `root press` (inspects section view), `directions press`. `meta.partTiers: { directions: "service" }`.
- States: filled, empty, loading.
- Real path: venue entry rules and seat-view photos stored with the event on the device; opening directions hands off to a maps service.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `discover_events` | Browse concerts, sports and theater | `ticketing_browse`, `ticketing_venue` | `ticketing_browse`: Header, FilterBar, EventDiscovery, Note · `ticketing_venue`: Header[back], VenueGuide, MapPins, Review |
| `pick_seats` | Compare tiers, deals and reserve seats | `ticketing_inventory`, `ticketing_checkout` | `ticketing_inventory`: Header[back], PriceTiers, SeatListings, Note · `ticketing_checkout`: Header[back], KeyValue, Amount, Choice, Button |
| `my_passes` | Present purchased passes on event day | `ticketing_wallet`, `ticketing_pass` | `ticketing_wallet`: Header, Segmented, TicketWallet[compact], Timer[until] · `ticketing_pass`: Header[back], TicketWallet[pass], VenueGuide[compact], Button |
| `sell_tickets` | Price and manage resale listings | `ticketing_sell`, `ticketing_listing` | `ticketing_sell`: Header[back], ResaleListing, Note, Button · `ticketing_listing`: Header[back], ResaleListing[summary], KeyValue, Button |

The first listed layout is each `defaultLayout`; all layout ids are `ticketing_`-prefixed and unique. Recipes use only core (including Wave 6 core `FilterBar` and `Review`) plus `ticketing`, keep every screen at 4–5 components, total weight at most 8, and at most one weight-3 component (`MapPins`).

## Worked example: FrontRow

A city live-events marketplace, distinct from Ledge (plant care) and Trot (dog walking). `discover_events/ticketing_browse` filters weekend shows under 100 and displays six concerts and sports games with starting prices and low-inventory tags. Selecting a concert opens `pick_seats/ticketing_inventory`: `PriceTiers` shows Floor (14 left, 180–240), Lower Bowl (42 left, 95–145) and Upper (110 left, 45–80); choosing Lower Bowl filters `SeatListings`, where toggling `allIn` switches row G from 110 base to 132 all-in with a Deal Score of 9. `ticketing_checkout` summarizes the hold and confirms payment.

Before the show, `my_passes/ticketing_wallet` counts down two days with core `Timer[until]` (`timer_spin` is the app's only signature); `my_passes/ticketing_pass` opens the perforated gate pass and clear-bag rules. If plans change, `sell_tickets/ticketing_sell` lists two Section 112 seats at 140 against a 125 market floor with a 10% fee, computing 14 fee per ticket and 252 net payout.

## Tiers

`TicketWallet` and `VenueGuide` work offline on the phone once passes and venue notes are cached. `EventDiscovery`, `PriceTiers`, `SeatListings`, `ResaleListing`, rotating pass refreshes and map handoffs require a live ticketing or maps service (`service`), while pass transfers require another attendee (`people`) and city-distance sorting uses optional location permission (`ok`).

## Build notes

- Order: `EventDiscovery`, `PriceTiers`, `SeatListings`, `TicketWallet`, `ResaleListing`, `VenueGuide`; all remain planned.
- Writers use strict `writerFormat(registry)` for core plus `ticketing`; no aliases or off-pack fallbacks. All ids (`eventId`, `tierId`, `listingId`, `passId`) are unique snake_case host references; repeated event or pass seeds across views must agree.
- All prices and ask amounts are numeric under the brief's single currency and formatted via `moneyLine`; never write formatted totals, fees, net payouts or all-in sums.
- `TicketWallet` reuses existing `KitTicket` and `KitCode` bases; `PriceTiers` uses `KitCard`, `KitRow`, `KitChip`, `KitTrail`, `KitText`, `KitAction` (not `KitSeatGrid`). Zoomable 60fps stadium vector seat maps stay `Canvas`.
- Keep all six components weight 2 with 1–6 visible rows and shared "and N more" overflow copy. Each component later ships two domain examples, choose/write/read probes and declared part/state tests, plus a three-preset `example.jsonl`.

## Open questions

- **60fps interactive stadium seat maps?** Default: stay `Canvas` until real misses justify a dedicated venue map adapter; `PriceTiers` and `SeatListings` cover tier/section selection cleanly without vector zoom.
- **Shopping cart for multi-event orders?** Default: single-listing hold checkout via `pick_seats/ticketing_checkout`; multi-item carts combine `ticketing` with `commerce` at app level.
- **New action names?** None. All actions use `press`, `toggle`, `select` and `set`.

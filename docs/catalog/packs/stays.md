# `stays` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Searching and booking lodging and travel fares: stay
cards, priced fare calendars, room rate options, amenity grids, stay policies and price-drop alerts. Not
managing booked trips (`trips`), not hourly appointments (`booking`).

## Purpose

Shopping for places to stay and comparing travel fares before booking: rich lodging search cards with
nightly and tax-inclusive pricing, monthly calendars annotated with daily fare tiers, selectable room and
cancellation rate plans within a property, categorized amenity checklists, clear check-in and refund
policies, and predictive buy-vs-wait fare alerts. Once booked, post-booking itineraries, passes, and
packing lists belong to `trips`.

## Apps it serves

Vacation home marketplace, hotel search and booking app, boutique bed-and-breakfast reservation portal,
flight-and-hotel price tracker, hostel booking guide.

## What the core already covers

- Verified guest reviews and five-bar rating breakdown: Core `Review`; standalone star rating:
  `Scale[readonly]`.
- Search, category pills, and multi-facet search filters: `Search`, `Chips`, `FilterBar`.
- Property photo carousels: `Gallery[carousel]`; host bio: `Profile`; neighborhood pins: `MapPins`.
- Post-booking day plans, passes, packing, and travel documents: `trips` (`Itinerary`, `Reservation`,
  `PackingList`, `TravelDocs`).
- Hourly provider services and staff calendars: `booking` (`ServiceMenu`, `Slots`, `Appointment`).

`StayCard` stays for lodging cards with capacity (guests/beds/baths), nightly versus tax-inclusive stay
totals, and superhost/cancellation tags; `FareCalendar` for price-colored daily cells across a month;
`RoomRates` for room-type and refund-tier selection inside one property; `AmenityGrid` for categorized
facilities and accessibility flags; `StayPolicy` for check-in windows and stepped refund timelines; and
`FareAlert` for buy-vs-wait price intelligence against historical ranges.

## Components (6)

### `StayCard` · planned · content · service
Lodging search card displaying property photo, lodging category and neighborhood, superhost badge, star
rating and review count, guest/bed/bath capacity summary, nightly rate beside computed tax-inclusive stay
total (`moneyLine`), free-cancellation pill, and a wishlist heart toggle.
- Pick: browsing or highlighting bookable hotels, rooms, or vacation rentals with nightly and stay totals.
  Not local cafés or venues (places `PlaceCard`), not homes for sale (realestate `HomeListing`), not owned
  rental management (inventory `Listing` or property `Units`).
- Writes: `stays` of `stayId` text(24), `name` text(36), `kind` (`hotel`, `apartment`, `cabin`, `house`,
  `hostel`), `area` text(28), `photo`, `rating` number 0–5 optional, `reviews` number ≥ 0 optional,
  `superhost` boolean (default false), `guests` number 1–20, `beds` number 1–16, `baths` number 1–12,
  `nightly` number > 0, `nights` number 1–90, `taxes` number ≥ 0 (default 0), `freeCancel` boolean
  (default false), `saved` boolean (default false), `goto`, 1–6; `style`. Stay subtotal and tax-inclusive
  total are computed by code and formatted via `moneyLine` in the brief's currency.
- Styles: `cards` (default, photo cards with capacity and price breakdown), `compact` (condensed list
  rows for map or dense browsing).
- Parts → actions: stays `root press`, stays `save toggle`.
- States: filled, empty, loading, error (availability search failed).
- Real path: live lodging inventory, availability, and nightly pricing retrieved from a lodging search
  service (`service`).

### `FareCalendar` · planned · input · service
Month calendar grid for check-in → check-out date selection (or single travel dates) showing per-day price
badges shaded low (`good`), typical (`muted`), or peak (`warn`), with sold-out nights crossed out and
disabled. Selecting a span shows the computed night count and base stay price below the grid.
- Pick: picking travel or lodging dates guided by daily price tiers. Not personal event calendars
  (`Calendar`), not hourly appointment chips (booking `Slots`), not multi-day trip schedules (trips
  `Itinerary`).
- Writes: `month` (`YYYY-MM`), `days` of `date`, `price` number > 0 optional, `tier` (`low`, `typical`,
  `peak`), `available` boolean (default true), 28–31; `checkIn` date optional, `checkOut` date optional,
  `minNights` number 1–30 (default 1), `style`. Code computes selected night count, blocks spans crossing
  unavailable dates, and sums daily prices into a formatted base total.
- Styles: `range` (default, check-in to check-out span selection), `single` (one-way departure fare date
  picker).
- Parts → actions: days `root select` (available only), `prev press`, `next press`, `clear press`.
- States: filled, empty (no fares in month), loading, error (pricing feed failed).
- Real path: daily rate availability and fare tier colors fetched from a lodging or fare search service
  (`service`).
- Density: `meta.dense: true`, weight 3; a full month calendar renders up to 31 price-annotated date cells.

### `RoomRates` · planned · input · service
Selectable room types and rate plans within one lodging property (`King Suite · Breakfast Included`,
`Standard Double · Free Cancellation`) showing bed configuration, max occupancy, remaining-room scarcity
pill ("2 left"), refund deadline date, total stay price, and delta over the cheapest rate.
- Pick: choosing a specific room category and meal/refund plan inside one hotel or property. Not generic
  single choices (`Choice`), not retail SKU swatches (commerce `VariantPicker`), not multi-property search
  cards (`StayCard`).
- Writes: `nights` number 1–90, `rooms` of `roomId` text(24), `name` text(32), `beds` text(24), `occupancy`
  number 1–12, `board` (`room_only`, `breakfast`, `half_board`, `all_inclusive`), `refundableUntil` date
  optional, `priceTotal` number > 0, `roomsLeft` number 0–20 optional, `photo` optional, 1–6; `selected`
  index optional, `goto` (booking review screen), `style`. Code computes nightly average, delta above base
  room, and disables selection when `roomsLeft === 0`.
- Styles: `cards` (default, full room cards with bed layout and refund timeline), `compact` (tight rate
  option rows).
- Parts → actions: rooms `root select` (available only), `reserve press` (goes to `goto`).
- States: filled, empty (sold out for selected dates), loading, error.
- Real path: live room inventory and cancellation rate plans retrieved from a hotel booking service
  (`service`).

### `AmenityGrid` · planned · content · phone
Categorized property amenity breakdown (Kitchen, Workspace, Parking, Accessibility, Safety) displaying clear
included check icons versus absent/excluded indicators, with a "Show all amenities" trigger opening the
screen's `Sheet` for full lists.
- Pick: scanning grouped property facilities and accessibility features on a stay detail page. Not four
  flat facts (`KeyValue`), not filter chips (`Chips`), not house rules or check-in times (`StayPolicy`).
- Writes: `groups` of `category` text(20), `items` of `label` text(28), `included` boolean, `icon`
  optional, 1–4, 2–5; `totalCount` number optional, `goto` (`sheet` optional), `style`. Included facility
  counts per group are computed by code.
- Styles: `grouped` (default, category headings with two-column facility marks), `highlights` (compact
  top-4 included amenities strip with full-list trigger).
- Parts → actions: `all press` (opens `goto` sheet when set).
- States: filled, empty, loading.
- Real path: structured property amenity attributes cached with the stay listing on the device or fetched
  alongside property details.

### `StayPolicy` · planned · content · phone
Structured house rules and booking terms displaying check-in and check-out time windows, a stepped
cancellation refund timeline (`100% refund`, `50% refund`, `Non-refundable` with cutoff dates), clear
allowed/disallowed icon rows for pets, smoking, parties, quiet hours, and children, plus deposit notes.
- Pick: displaying lodging check-in hours, stepped cancellation refund windows, and house rules. Not
  client legal waivers (customers `Agreement`), not venue business hours (places `Hours`), not rental lease
  contracts (inventory `Lease`).
- Writes: `checkInFrom` HH:MM, `checkInTo` HH:MM optional, `checkOutBy` HH:MM, `cancelSteps` of `label`
  text(32), `until` date optional, `refundPercent` number 0–100, 1–3; `rules` of `kind` (`pets`, `smoking`,
  `parties`, `quiet_hours`, `children`), `allowed` boolean, `note` text(36) optional, 1–5; `deposit`
  number ≥ 0 optional, `style`. Deposit formats via `moneyLine`; code marks the currently active refund
  window from today's date.
- Styles: `full` (default, check-in/out header, stepped cancellation timeline, and rule icons), `compact`
  (condensed policy summary for booking checkout review).
- Parts → actions: `details toggle` (expand extra policy notes).
- States: filled, loading.
- Real path: host house rules and cancellation policy attached to the property listing on the device.

### `FareAlert` · planned · data · service
Price-intelligence tracker card comparing the current stay or fare rate against its historical range
(`KitRangeBand`), showing a `Buy now` (`good`), `Fair` (`muted`), or `Wait` (`warn`) recommendation badge,
a recent price sparkline, a price-drop notification toggle, and a confirmed delete control.
- Pick: tracking price drops and buy-vs-wait advice for a lodging stay or travel fare. Not stock watchlists
  (invest `Watchlist`), not static totals (`Amount`), not retail wishlists (commerce `SavedList`).
- Writes: `alerts` of `alertId` text(24), `title` text(36), `dates` text(24), `current` number > 0, `min`
  number > 0, `low` number ≥ `min`, `high` number ≥ `low`, `max` number ≥ `high`, `advice` (`buy_now`,
  `wait`, `fair`), `confidence` text(32) optional, `history` of number > 0, 4–12; `watching` boolean
  (default true), `goto` optional, 1–4; `style`. Savings versus historical typical range and band clamping
  are computed by code.
- Styles: `intelligence` (default, range band, advice badge, sparkline, and alert toggle), `compact`
  (current fare, advice pill, and watch toggle row).
- Parts → actions: alerts `root press` (linked), alerts `watch toggle`, alerts `remove press`.
  `meta.confirmParts: ["remove"]`; `meta.partTiers: { watch: "ok" }`.
- States: filled, empty, loading, success (alert saved or removed), error (pricing feed unavailable).
- Real path: historical price distribution and predictive buy/wait signals from a fare intelligence service
  (`service`), with price-drop alerts requiring notification permission (`ok`).

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `stay_browse` | Browse filtered stays, map pins, and price-annotated dates | `stays_results`, `stays_dates`, `stays_map` | `stays_results`: Header, FilterBar, StayCard, Note · `stays_dates`: Header[back], FareCalendar, Note, Button · `stays_map`: Header, Search, Chips, MapPins, StayCard[compact] |
| `stay_detail` | Inspect a property, amenities, reviews, and room rate options | `stays_listing`, `stays_rooms` | `stays_listing`: Header[back], Gallery[carousel], StayCard[compact], AmenityGrid, Review, Button, Sheet · `stays_rooms`: Header[back], RoomRates, StayPolicy, Button |
| `stay_book` | Review selected room rate, house rules, and booking summary | `stays_review` | Header[back], RoomRates[compact], StayPolicy[compact], KeyValue, Button |
| `fare_watch` | Watch price drops and buy-vs-wait fare signals | `stays_tracker` | Header, Search, FareAlert, Note |

Each archetype's `defaultLayout` is its first listed layout; all layout ids are `stays_`-prefixed and
unique. Recipes use only core (including wave 6 core `FilterBar` and `Review`) plus `stays`, stay within
weight 11, and include at most one weight-3 component per screen.

## Worked example: Hearth & Harbor (lodging & fare watch)

A traveler planning a four-night coastal getaway searches on `stay_browse/stays_results` with `FilterBar`
and `StayCard`, then opens `stay_browse/stays_dates` to pick low-tier Tuesday-to-Saturday dates (`$142`
to `$158`/night) on `FareCalendar`. Tapping "Salt Marsh Cottage" opens `stay_detail/stays_listing` with
`Gallery[carousel]`, `AmenityGrid` (Workspace, Kitchen, Parking, with full-list `Sheet`), and `Review`.
Proceeding to `stay_detail/stays_rooms` selects "Garden Studio · Free Cancellation" on `RoomRates` and
confirms terms on `stay_book/stays_review` (`StayPolicy`), while a second autumn search watches rates on
`fare_watch/stays_tracker` where `FareAlert` advises `Wait` near the top of the `KitRangeBand`. Signature:
`calendar_sweep` on date transitions or `count_up` on total stay savings; no new signature.

## Tiers

`AmenityGrid` and `StayPolicy` render from listing records on the `phone`. `StayCard`, `FareCalendar`,
`RoomRates`, and `FareAlert` depend on live availability and pricing `service` feeds; enabling price-drop
notifications on `FareAlert` uses `ok` permission (`!needs-ok`).

## Build notes

- Order: `StayCard`, `FareCalendar`, `RoomRates`, `AmenityGrid`, `StayPolicy`, `FareAlert`.
- Reuse `KitWeekGrid`, `KitDayMark`, `KitRangeBand`, `KitSpark`, and `KitStepsTrack`; no new kit base or
  signature is needed.
- Money amounts are numeric and formatted by code with `moneyLine` under the brief's currency; never write
  formatted currency strings in props.
- Keep `trips` (`Itinerary`, `Reservation`, `PackingList`, `TravelDocs`) separate so trip management apps
  never pull booking inventory schemas unless both packs are requested.

## Open questions

- **Multi-leg commercial flight result cards?** Deferred to a future `flights` pack if airline carrier
  search generates recurring `Canvas` misses; fare calendars and buy-vs-wait alerts here already handle
  single-leg or hotel price intelligence.
- **New actions?** None. Date selection, room selection, wishlist saves, and alert removals use `select`,
  `toggle`, and confirmed `press`.

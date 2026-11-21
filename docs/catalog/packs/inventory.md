# `inventory` pack

**Status:** new · **Wave:** 5 · **Pick line:** Keeping track of things owned: stock, collections, storage,
loans, warranties, rentals. Not selling them (`commerce`).

## Purpose

Knowing what you have, where it is, who has it, when its warranty ends and what you still want, from a
garage of boxes to a small shop's stock room, a record collection or a few rental flats. For rentals it
covers the listing, the lease and a single rental-repair summary only; any request workflow (queue,
triage, thread, work order) belongs to the `requests` pack. The tenants themselves are `customers`.

## Apps it serves

Home inventory for insurance, moving-house box tracker, collection catalogue (records, plants, cards,
books), small shop or café stock room (with `data`), tool library or kit lending, school or club equipment,
landlord with a few flats (with `customers`, `money`), wishlist of things to buy.

## What the core already covers

- One thing's photos and facts: `Gallery`, `KeyValue`; its value: `Amount`.
- Scanning a barcode to find or add a thing: `Camera` kind `scan` (the draft `ScanInput` is dropped).
- How complete a collection is: `Progress` ("34 of 50"); low stock as a warning: `Banner`.
- Searching and filtering: `Search`, `Chips`; a repair's history: `Timeline` style `history`.

The draft `StockLevel` is folded into `Things` (a `min` per thing marks low stock), and the draft
`ItemCard` is the `Things` grid's cell.

## Components (8)

### `Things` · planned · content · phone
Things owned, as a grid of photo cells or as rows: name, quantity, where it is kept, a low-stock mark when
the quantity is at or under its minimum, and an optional value.
- Pick: things the person owns or stocks. Not things for sale (commerce `ProductGrid`), not food at home
  (kitchen `Pantry`), not a media library (media `Library`), not a list of anything (`List`).
- Writes: `items` of `name` text(28), `photo` optional, `qty` number, `min` number optional, `where`
  text(24) optional, `value` number optional, `goto`, 1–12; `filter` (`all`, `low`); `style`. Low stock is
  computed from `min`.
- Styles: `grid` (default), `rows`, `audit` (Wave 6: expected vs counted stocktake reconciliation).
- Parts → actions: items `root press`, items `qty increment`, items
  `qty decrement`. · States: filled, empty, loading. · Dense.
- Real path: records on the device.
- Wave 6 options: add `filter: "missing"` (collection checklist gap mode), plus optional `serial` text(24) and `condition` (`new`, `good`, `worn`, `damaged`).

### `Storage` · planned · content · phone
Places within places: a breadcrumb at the top (Garage › Shelf 2), then the spots inside this one with how
many things each holds, and the things kept right here.
- Pick: where things are kept, as rooms, shelves and boxes inside each other. Not places on a map
  (`MapPins`, places `MapList`), not things themselves (`Things`).
- Writes: `path` text(16) each, 0–4; `spots` of `name` text(24), `icon`, `goto`, 0–6; `here` text(28)
  each, 0–6. How many things each spot holds is computed.
- Parts → actions: path items `root press`, spots `root press`. · States: filled, empty.
- Real path: a tree of spots on the device.
- Wave 6 options: add `code` text(24) (box QR/label), `fragile` boolean, and `status` (`packing`, `sealed`, `in_transit`, `unpacked`) for moving trackers.

### `Loans` · planned · data · phone
What is lent and borrowed: each thing with its photo, the person, since when, due back, overdue in `bad`,
and "Returned".
- Pick: things lent to or borrowed from people. Not a list of anything (`List`), not money owed (money
  `Split`), not bookings (booking `Appointment`).
- Writes: `loans` of `thing` text(28), `photo` optional, `person` text(20), `way` (`lent`, `borrowed`),
  `since` date, `due` date optional, 1–6. Overdue is computed.
- Parts → actions: items `returned press` (in `confirmParts`), items `remind press` (`partTiers`: `service`).
- States: filled, empty. · Real path: records on the device.
- Wave 6 options: add optional `conditionOut` and `conditionIn` notes for tool and equipment lending.

### `Warranties` · planned · data · phone
Receipts and warranties: each thing with where and when it was bought, the price, a receipt thumbnail, and
the warranty's end, ending soon in `warn` and ended in grey.
- Pick: proof of purchase and warranty dates for things owned. Not travel documents (trips `TravelDocs`),
  not bills to pay (money `Bills`).
- Writes: `items` of `thing` text(28), `shop` text(20) optional, `bought` date, `price` number optional,
  `ends` date optional, `receipt` photo optional, 1–6. Status is computed from `ends`.
- Parts → actions: items `root press`. · States: filled, empty.
- Real path: receipts photographed and stored on the device.

### `Wishlist` · planned · input · phone
Things the person wants: photo, name, price and a target price, a priority, where to get it, and "Got it",
after which the host adds a `Things` record and removes the wish.
- Pick: the person's own list of things to get. Not gifts guests can claim (events `Registry`), not a shop's
  products (commerce `ProductGrid`).
- Writes: `items` of `name` text(28), `photo` optional, `price` number optional, `target` number optional,
  `priority` 1–3, `where` text(24) optional, 1–6.
- Parts → actions: items `got press` (in `confirmParts`), items `root press`. · States: filled, empty.
- Real path: records on the device; price tracking would be a `service`.
- Wave 6 options: add optional `targetAlert` boolean (`meta.partTiers: { alert: "service" }`) for price-drop alerts.

### `Listing` · planned · content · phone
A place to rent or buy: price per month or the asking price, beds, baths and area as icon facts, the
address line, available from, and a short description; photos sit above it in a `Gallery`.
- Pick: one property or rental offered. Not a venue to visit (places `PlaceCard`), not a product (commerce
  `Product`).
- Writes: `title` text(32), `price` number, `per` (`month`, `week`, `none`), `beds` 0–20, `baths` 0–10,
  `area` number, `areaUnit` (`m2`, `ft2`), `where` text(40), `from` date optional, `about` text(160).
- Parts → actions: `contact press` (`partTiers`: `service`), `save toggle`. · States: filled, loading.
- Real path: listings stored on the device.

### `Request` · planned · input · people
A single rental-repair summary only: what is wrong, where, a photo, priority, status (new, booked, fixed),
who is on it, and brief updates. Any request workflow (queue, triage, thread, work order) is the
`requests` pack.
- Pick: a single rental-repair summary only. Any request workflow (queue, triage, thread, work order) is
  the `requests` pack. Not a staff request for time off (team `Approval`), not a general board of work
  (data `Board`).
- Writes: `title` text(32), `where` text(24), `photo` optional, `priority` (`low`, `normal`, `urgent`),
  `status` (`new`, `booked`, `fixed`), `who` text(20) optional, `updates` of `time` text(12), `text`
  text(36), 0–4.
- Parts → actions: `status select` (landlord), `update type`. · States: filled, success (fixed).
- Real path: requests in a shared app between tenant and landlord.
- Wave 6 note: flagged for retirement in favor of the `requests` pack; keep `Listing` and `Lease` strictly for single-landlord item or property records (`realestate` and `property` handle full home-buying search and multi-unit rent ledgers).

### `Lease` · planned · data · phone
One lease: the tenant and the place, start and end dates with the time left as a bar, rent and when it is
next due, the deposit held, and the renewal date flagged as it nears.
- Pick: the terms and dates of one rental agreement. Not facts about one thing (`KeyValue`): it computes
  the time left, the next rent date and the renewal warning. Not terms someone signs once (customers
  `Agreement`), not a bill (money `Bills`).
- Writes: `tenant` text(24), `place` text(32), `start` date, `end` date, `rent` number, `per` (`month`,
  `week`), `due` day 1–31, `deposit` number optional. Time left and the next due date are computed.
- Parts → actions: `root press`. · States: filled. · Real path: lease records on the device.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `things` | Everything I have | `grid`, `low`, `add` | `grid`: Header, Search, Chips, Things, Button · `low`: Header, Segmented, Things (`filter: low`), Button · `add`: Header, Field[photo], Field, Field[number], Button |
| `thing` | One thing | `detail` | Header[back], Gallery, KeyValue, Amount, Warranties |
| `storage` | Where things are | `browse`, `loans`, `wants` | `browse`: Header, Search, Storage · `loans`: Header, Segmented, Loans · `wants`: Header, Chips, Wishlist, Button |
| `rentals` | My rental places | `listings`, `listing`, `lease`, `repairs`, `repair` | `listings`: Header, Chips, List[cards] · `listing`: Header[back], Gallery[carousel], Listing · `lease`: Header[back], Lease, Timeline[history] · `repairs`: Header, Segmented, List, Button · `repair`: Header[back], Request, Photo |

## Worked example: Boxes

Moving house. Every box is a `Storage` spot ("Kitchen box 3 · 14 things") with its things photographed;
`things/grid` finds the kettle by search; the sofa and TV have `Warranties`; the drill is lent to a
neighbour (`Loans`); `storage/wants` lists a new lamp with a target price. Signature: `count_up` on boxes
unpacked.

A second take, **Flats**: a landlord's three rentals as `rentals/listings`; one flat's `Lease` warns that
renewal is in 40 days; a tenant's leaking-tap `Request` moves from new to booked on `rentals/repair`.

## Tiers

`Request` needs tenant and landlord on a shared app; contacting about a `Listing` and loan reminders are
`service` parts. Everything else is `phone`.

## Build notes

- Order: `Things`, `Storage`, `Loans`, `Warranties`, `Wishlist`, `Listing`, `Lease`, `Request`.
- Moving a thing between locations is its detail screen's `Field` kind `choice` or a `Sheet` style
  `picker` of spots; no drag.
- **Wave 6 additions & options:**
  - `+0` new components: Wave 6 extends existing inventory components via options rather than adding new IDs.
  - Option/style upgrades: `Things` gains `style: "audit"` (stocktake expected vs counted), `filter: "missing"`, optional `serial` text(24) and `condition` (`new`, `good`, `worn`, `damaged`); `Storage` gains `code` text(24), `fragile` boolean and `status` (`packing`, `sealed`, `in_transit`, `unpacked`); `Loans` gains `conditionOut` / `conditionIn` notes; `Wishlist` gains `targetAlert` (`meta.partTiers: { alert: "service" }`).
  - Boundary note: flag `inventory/Request` for retirement in favor of `requests`; keep `Listing` and `Lease` strictly for single-landlord item/property records.

## Open questions

- **Insurance export?** Default: out of scope; a host feature that exports `Things` with values and receipts.

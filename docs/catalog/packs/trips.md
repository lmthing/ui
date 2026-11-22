# `trips` pack

**Status:** new · **Wave:** 3 · **Pick line:** Travelling: itineraries, reservations, packing, documents,
weather. Not organising an event (`events`), not finding a café nearby (`places`).

## Purpose

One trip from planning to coming home: the plan day by day, the confirmations for flights, trains, stays and
tickets, what to pack, the documents to carry, the weather where you are going, money in the local currency
and the time back home. Shared costs on a trip come from `money`; places to visit from `places`.

## Apps it serves

Holiday planner, family road trip, group trip with a shared plan, business travel organiser, school trip
for a class, festival weekend, backpacking route, a honeymoon itinerary (with `events` for the wedding).

## What the core already covers

- Days until departure: `Timer` style `until`; the trip's places on a map: `MapPins`; a road route: `Route`.
- Trip photos: `Gallery`; a trip journal: `Composer` style `entry` and the core `journal` archetype.
- The trips planned: `List` style `cards` with photos and dates; a travel buddy group: `People`.
- One day's plan in time order: `Timeline` style `day`.

The draft `TripBudget` and `Countdown` are dropped: a trip budget is the `money` pack (`Split`, `Progress`),
and a countdown is `Timer` style `until`.

## Components (10)

### `Itinerary` · planned · data · phone
The whole trip day by day: each day as a heading with its date and place, its stops with times, and the
travel legs between them (a train icon and "2 h 10"), the current day open and the others folded.
- Pick: a trip's plan across several days. Not one day by the hour (`Timeline`), not a path through stops
  on a map (`Route`), not a family's coming week (home `Agenda`).
- Writes: `days` of `date`, `place` text(24), `stops` of `time` HH:MM optional, `title` text(32),
  `kind` (`stop`, `travel`, `stay`, `meal`), `minutes` number optional (travel), `goto`, 1–6, 1–14.
- Parts → actions: days `root toggle` (fold), stops `root press`. · States: filled, empty. · Dense.
- Real path: the plan stored on the device; a shared plan needs a shared app.

### `Reservation` · planned · content · phone
A booking confirmation drawn as a ticket: what it is (flight, train, bus, stay, car, ticket), from and to
with times, the reference code large, seat or room, and for passes a scannable code.
- Pick: a confirmation for travel, a stay or a ticket bought elsewhere. Not an appointment with a provider
  (booking `Appointment`), not an event ticket for an event the person runs (events `Ticket`), not an order
  of goods (commerce `OrderSummary`).
- Writes: `kind` (`flight`, `train`, `bus`, `ferry`, `stay`, `car`, `ticket`), `title` text(32), `from`
  text(20) optional, `to` text(20) optional, `start` date and HH:MM, `end` date and HH:MM optional, `ref`
  text(12), `seat` text(12) optional, `code` boolean (show a scannable pass), `style`. Live flight status
  would be a `service` and waits for misses.
- Styles: `card` (default), `pass` (full-width pass with the code, for the gate or the door).
- Parts → actions: `ref press` (copies), `root press`. · States: filled, loading.
- Real path: details typed in or pasted from a confirmation email on the device; live flight status would be
  a `service`. · Kit: `KitTicket`.

### `PackingList` · planned · input · phone
What to pack, grouped by category (clothes, toiletries, documents, tech) or by person, with a count per
item, ticked items greyed, and the share packed at the top.
- Pick: packing for a trip. Not general jobs (`Checklist`), not groceries (kitchen `GroceryList`).
- Writes: `groups` of `label` text(16), `items` of `name` text(28), `qty` number optional, `packed`
  boolean, 1–10, 1–6. The share packed is computed.
- Parts → actions: items `packed check`, `add type`. · States: filled, empty, success (all packed). · Dense.
- Real path: the list on the device; a shared family list needs a shared app.

### `Weather` · planned · data · service
The forecast for the trip's place: today large with an icon and the high and low, then a strip of the next
days, with rain chance in `warn` when high.
- Pick: the weather where the person is going or is. Not numbers of their own (`Stats`), not a trend
  (`Sparkline`).
- Writes: `place` text(24), `from` and `to` dates optional (the trip's days; beyond the forecast range it
  shows typical weather for the month). The forecast comes from a weather service.
- States: filled, loading, error and offline (drawn like core `Empty` kinds). · Real path: a weather service.
- Wave 6 note: standalone weather apps migrate to the Wave 6 `weather` pack; `trips/Weather` stays intact here for trip overview forecasts.

### `TravelDocs` · planned · data · phone
The documents for the trip: passport, visa, insurance, licence, vaccination; each with whose it is, its
number masked, its expiry, and a warning in `warn` or `bad` when it ends before or soon after the trip.
- Pick: documents with expiry dates for travel. Not warranties for things owned (inventory `Warranties`),
  not facts about one thing (`KeyValue`).
- Writes: `docs` of `kind` (`passport`, `visa`, `insurance`, `licence`, `health`, `other`), `who`
  text(16), `number` secret(16), `expires` date, 1–6; `tripEnds` date optional. Warnings are computed.
- Parts → actions: docs `root press`. · States: filled, empty.
- Real path: details stored on the device; numbers always read as `(secret)`.

### `Converter` · planned · input · service
Two amounts in two currencies, one above the other; typing in either updates the other, with a swap
button and the rate's date.
- Pick: converting money between the home and local currency. Not entering an expense (money `AmountPad`),
  not one sum (`Amount`).
- Writes: `value` number optional. The two currencies are the brief's home currency and the trip's local
  currency; the rate comes from a rates service.
- Parts → actions: `from type`, `to type`, `swap press`. · States: filled, loading.
- Real path: exchange rates from a rates service, cached on the device for offline use.

### `Clocks` · planned · data · phone
The time in two to four places side by side, with the difference from home ("+9 h") and whether it is day or
night there.
- Pick: what time it is in other places. Not timing something (`Timer`), not a day's plan (`Timeline`).
- Writes: `places` of `label` text(16), `zone` (an IANA time zone id from the catalog's zone list), 2–4.
  Times and differences are computed.
- States: filled. · Real path: the device's clock and time zone data.

### `FlightStatus` · planned · data · service
Live operational monitor for one booked flight showing the flight number, airline, origin-to-destination progress arc, status pill ("On time", "Delayed", "Boarding", "Landed"), scheduled versus estimated departure and arrival times, terminal, gate, baggage claim, and an optional inbound aircraft link. Refreshing polls updated airline telemetry; tapping the inbound flight opens the preceding leg when linked.
- Pick: live operational status, gate updates, and progress of one specific booked flight. Not static booking confirmations or boarding passes (`Reservation`), and not airport-wide departure boards (places `Departures`).
- Writes: `flight` text(10), `airline` text(24), `origin` text(4), `originCity` text(20), `destination` text(4), `destinationCity` text(20), `scheduledDep` HH:MM, `estimatedDep` HH:MM optional, `scheduledArr` HH:MM, `estimatedArr` HH:MM optional, `status` (`scheduled`, `on_time`, `delayed`, `boarding`, `in_air`, `landed`, `cancelled`), `progress` number 0–1 optional, `terminal` text(8) optional, `gate` text(8) optional, `baggage` text(12) optional, `inboundFlight` text(10) optional, `inboundGoto` optional, `style`. Delay minutes and status tone are computed by code from scheduled versus estimated times and `status`.
- Styles: `card` (default, route progress arc, status pill, times, and gate/terminal grid), `compact` (single-strip status, gate, and departure time).
- Parts → actions: `refresh press`, `inbound press` (opens `inboundGoto` when linked).
- States: filled, loading, error (airline feed unavailable).
- Real path: live flight status, gate changes, and airborne progress fetched from an aviation status service.

### `BagTracker` · planned · data · service
Checked luggage custody chain displaying each bag's tag ID, weight, and sequential scan milestones ("Checked in", "Security", "Loaded", "Unloaded", "Carousel") with timestamps and airport locations. Carousel claim numbers surface upon arrival, and reporting a missing bag opens a delayed-luggage claim after confirmation.
- Pick: tracking checked luggage across airport scan checkpoints. Not courier parcel delivery on a map (places `DeliveryTracker`), retail order fulfillment (commerce `OrderStatus`), or trip packing (`PackingList`).
- Writes: `bags` of `tag` text(16), `label` text(24) optional, `weight` text(12) optional, `flight` text(10) optional, `carousel` text(12) optional, `steps` of `stage` (`checked_in`, `security`, `loaded`, `in_transit`, `unloaded`, `carousel`), `at` text(16) optional, `location` text(24) optional, `done` boolean, 1–6, 1–4; `reportGoto` optional; `style`. Current active stage and next milestone are computed by code from the scan sequence.
- Styles: `timeline` (default, step track with timestamped scan rows), `compact` (latest scan stage and carousel badge per bag).
- Parts → actions: bags `root select` (switches active bag), `refresh press`, `report press` (goes to `reportGoto`). `meta.confirmParts: ["report"]`.
- States: filled, empty (no checked bags linked), loading, success (delivered to baggage carousel), error (delayed or missing scan alert).
- Real path: baggage custody scans and carousel assignments synced from the airline's baggage-handling service.

### `CabinSeats` · planned · input · service
Interactive aircraft or train cabin seat grid laid out in numbered rows and lettered columns with aisle gaps, distinguishing standard, extra-legroom, exit-row, occupied, and selected seats. Tapping an open seat previews the seat label, attributes, and upgrade fee delta before confirming selection.
- Pick: picking or changing a numbered seat on a plane or train. Not banquet event tables (events `Seating`), cinema auditorium seats (watch `SeatPicker`), or fare tier options (`Choice`).
- Writes: `cabin` text(24), `columns` text(2) each 2–10 (aisle gaps marked as `""`), `rows` of `row` integer 1–99, `exit` boolean (default false), `seats` of `col` text(2), `status` (`open`, `occupied`, `extra`, `selected`), `fee` number ≥ 0 optional, 1–10, 1–20; `passenger` text(24) optional, `style`. Selected seat label and upgrade fee total are computed by code; rendered with `KitSeatGrid`.
- Styles: `cabin` (default, full row-by-column grid with aisle spacing and legend), `compact` (zoomed section around the selected row).
- Parts → actions: seats `root select`, `confirm press`.
- States: filled, empty (seat map unavailable), loading, success (seat confirmed), error (seat taken or assignment failed).
- Real path: live cabin inventory and seat fees fetched and reserved through the carrier's booking service.
- Renderer: reuse the Trips `CabinSeats` view adapter over `SeatPlan` / `KitSeatGrid`. Keep the single selection, fee preview and confirm policy in Trips. The adapter is not a Writer entry.
- Density: `meta.dense: true`, weight 3; multi-row cabin seat matrices hold up to 20 rows and 10 columns.

## Archetypes (5)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `trips_all` | All my trips | `list` | Header, List[cards], Button |
| `trip` | One trip at a glance | `overview` | Header, Timer[until], Weather, Itinerary, Button |
| `day` | One day of the trip | `today` | Header[back], Timeline[day], MapPins, Reservation |
| `bookings` | Confirmations and documents | `list`, `docs`, `pass` | `list`: Header, Segmented (Bookings, Documents), List · `docs`: Header, Segmented, TravelDocs · `pass`: Header[back], Reservation[pass], KeyValue |
| `prep` | Getting ready | `packing`, `tools` | `packing`: Header, Timer[until], PackingList · `tools`: Header, Converter, Clocks |

## Worked example: Wander

A ten-day Japan trip for two. `trip` counts down 23 days with Tokyo's forecast and the itinerary from Tokyo
to Kyoto to Osaka; `day` shows the Kyoto day with temples on a map and the hotel's `Reservation`;
`bookings/pass` shows the Shinkansen pass at the gate; `prep/packing` is 70% packed; `prep/tools` converts
yen and shows home time. Signature: `route_draw` on a day's path.

## Tiers

`Weather` and `Converter` need services (rates are cached for offline use). Everything else is `phone`; a
group's shared plan needs a shared app.

## Build notes

- Order: `Itinerary`, `Reservation`, `PackingList`, `TravelDocs`, `Weather`, `Clocks`, `Converter`; Wave 6 additions follow in order: `FlightStatus`, `BagTracker`, `CabinSeats`.
- `Itinerary` reads one line per day ("Tue 4 Mar Kyoto: 09:00 Fushimi Inari, train 25 min, 13:00 Nishiki").
- `TravelDocs` uses the core `secret` helper, so numbers never reach a model.
- Wave 6 migration & option upgrades: standalone forecast apps move to the Wave 6 `weather` pack (`trips/Weather` remains intact here for trip overview screens, while trip apps needing full hourly/radar forecasts load `trips` + `weather`). On existing components: `Reservation` adds optional `terminal` text(8), `gate` text(8), `boarding` HH:MM, `zone` text(10), `baggage` text(12), and `status` (`on_time`, `delayed`, `boarding`, `checked_in`, `cancelled`); `Converter` extends `currencies` to a 3–6 ISO currency switcher; `PackingList` adds optional `who` text(16) per item; `Itinerary` adds optional `cost` number and `ref` text(12) linking to `Reservation`.
- Wave 6 boundaries: commercial lodging search and fare calendars belong in `stays`; turn-by-turn street and transit routing belongs in `navigation`. `CabinSeats` shares `SeatPlan` with `watch/SeatPicker`.

## Open questions

- **Importing confirmations from email?** Default: out of scope; a host feature that fills `Reservation`.

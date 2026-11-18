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

## Components (7)

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

- Order: `Itinerary`, `Reservation`, `PackingList`, `TravelDocs`, `Weather`, `Clocks`, `Converter`.
- `Itinerary` reads one line per day ("Tue 4 Mar Kyoto: 09:00 Fushimi Inari, train 25 min, 13:00 Nishiki").
- `TravelDocs` uses the core `secret` helper, so numbers never reach a model.

## Open questions

- **Importing confirmations from email?** Default: out of scope; a host feature that fills `Reservation`.

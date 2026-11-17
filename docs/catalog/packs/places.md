# `places` pack

**Status:** revised · **Wave:** 4 · **Pick line:** Where things are and getting there: venues, addresses,
deliveries, departures. Not planning a trip (`trips`).

## Purpose

Real places and moving between them: a venue's card and opening hours, an address to copy or navigate to, a
map with a list beside it, a delivery coming to the door, and the next departures from a stop. Maps and live
data need a service.

## Apps it serves

Local guide to cafés or playgrounds, a shop's "find us" page, a food truck's spots, delivery tracking for a
small business, a dog-friendly places finder, a commute departures board, a club's venues, recycling points.

## What the core already covers

- Up to five places on a map: `MapPins`; a path through stops: `Route`.
- A place's photos: `Gallery` style `carousel`; its facts and amenities: `KeyValue` style `grid` with icons;
  its rating: `Scale` with `readonly`.
- A list of places with a short line each: `List`; a featured place: `Card`.

## Components (6)

### `PlaceCard` · planned · content · ok
A venue summarised: photo, name, category, rating, price level, distance from the person, and "Open now" or
"Closes 18:00" in `good` or `warn`.
- Pick: one place to visit, summarised with its open state and distance. Not any featured thing (`Card`),
  not several places as rows (`List`), not a product (commerce `Product`), not a rental (inventory
  `Listing`).
- Writes: `name` text(32), `category` text(20), `photo` optional (leave out under a `Gallery`), `rating`
  0–5 optional, `priceLevel` 1–4 optional, `opens` and `closes` HH:MM optional, `goto`. Open state is
  computed from the times and the clock; distance from the person's location.
- Parts → actions: `root press`. · States: filled, loading.
- Real path: place details stored with the app; distance needs location permission.
- Aliases: placecard, venue, spot, locationcard.

### `Address` · planned · content · phone
An address on two or three lines with a small map tile, and copy, directions and call buttons.
- Pick: where one place is, to get there. Not facts about a place (`KeyValue`), not a delivery's progress
  (`DeliveryTracker`).
- Writes: `lines` text(40) each, 1–3; `phone` text(20) optional; `note` text(80) optional ("Ring the side
  door").
- Parts → actions: `copy press`, `directions press` and `call press` (`partTiers`: `service`).
- States: filled. · Real path: the address stored with the place; directions open the phone's maps app.
- Aliases: address, findus, directions.

### `Hours` · planned · data · phone
Opening hours by weekday with today in bold, "Open now · closes 18:00" at the top, and special days flagged.
- Pick: when a place is open. Not when bookings can be made (booking `Availability`), not staff shifts
  (team `Roster`).
- Writes: `days` of `day` (mon…sun), `from` HH:MM, `to` HH:MM, `closed` boolean, exactly 7; `special` of
  `date`, `text` text(24), 0–3. "Open now" is computed.
- States: filled. · Real path: hours stored with the place. · Aliases: hours, openinghours, opentimes.

### `DeliveryTracker` · planned · data · service
A delivery on its way: a map with the courier and the destination, the ETA large, the current step (picked
up, on the way, nearby, delivered), the courier's name and a call button.
- Pick: following something coming to the person, on a map. Not an order's steps without a map (commerce
  `OrderStatus`), not a path through stops (`Route`).
- Writes: `step` (`preparing`, `picked_up`, `on_the_way`, `nearby`, `delivered`), `courier` text(20)
  optional, `photo` optional. The ETA comes from the delivery service.
- Parts → actions: `call press`. · States: filled, loading, success (delivered).
- Real path: live courier location from a delivery service. · Aliases: delivery, tracking, courier, eta.

### `MapList` · planned · content · service
A map on top and the same places as a list below, kept in step: tapping a pin highlights its row; a toggle
switches to list only.
- Pick: browsing more than five places both on a map and as a list. Not up to five pins (`MapPins`), not a
  list with no map (`List`).
- Writes: `places` of `name` text(28), `meta` text(32), `goto`, 1–6 (and "N more" beyond). Distances come
  from the person's location.
- Parts → actions: items `root press`, `view select` (map or list). · States: filled, empty, loading.
- Real path: a map service draws the map and places. · Aliases: maplist, nearby, mapview, explore.

### `Departures` · planned · data · service
The next departures from one stop: line badge, destination, minutes to go (live ones in `good`), delays in
`warn`.
- Pick: when the next bus, train or ferry leaves. Not a day's plan (`Timeline`), not a journey's stops
  (`Route`).
- Writes: `stop` text(32), `rows` of `line` text(6), `to` text(28), 1–6. Minutes and delays come from the
  transit service.
- Parts → actions: items `root press`. · States: filled, empty, loading.
- Real path: live times from a transit data service. · Aliases: departures, nextbus, transit, livetimes.

## Archetypes (3)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `places` | Places near me | `map`, `list` | `map`: Header, Search, Chips, MapList · `list`: Header, Search, Chips, List |
| `place` | One place | `venue`, `walk` | `venue`: Header[back], Gallery[carousel], PlaceCard, Hours, Address, Button · `walk`: Header[back], Route, List |
| `tracking` | Something on its way | `delivery`, `departures` | `delivery`: Header, DeliveryTracker, KeyValue · `departures`: Header, Departures |

## Worked example: Sniff

Dog-friendly places nearby. `places/map` shows parks and cafés in a `MapList` filtered by "water bowl" and
"off lead"; a café opens as `place/venue` with photos, its `PlaceCard` (no photo), `Hours` and `Address`;
`place/walk` suggests a route between two parks. Signature: `route_draw`.

## Aliases that shadow the core

With `places`: `nearby` → `MapList` (otherwise `MapPins`). No other alias here matches a core alias.

## Tiers

`PlaceCard` needs location for distance (`ok`). `MapList`, `DeliveryTracker` and `Departures` need a
service; `Address` directions and calls are `service` parts. `Hours` works on the phone.

## Build notes

- Order: `PlaceCard`, `Hours`, `Address`, `MapList`, `DeliveryTracker`, `Departures`.
- Maps share `KitMapTile` styling, so `MapPins`, `MapList` and `DeliveryTracker` look like one family.

## Open questions

- **Weather?** In `trips` (a forecast for trip days).

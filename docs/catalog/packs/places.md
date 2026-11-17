# `places` pack

**Status:** revised · **Wave:** 4 · **Pick line:** Where things are and getting there: venues, addresses,
deliveries. Not planning a trip (`trips`).

## Purpose

Real places and moving between them: a venue's card and opening hours, an address to copy or navigate to,
a map with a list beside it, a delivery coming to the door, and the next departures from a stop. Most of it
needs a map or location service.

## Apps it serves

Local guide to cafés or playgrounds, a shop's "find us" page, a food truck's locations, delivery tracking
for a small business, a dog-friendly places finder, a commute departures board, a club's venues, a
neighbourhood's recycling points.

## What the core already covers

- A few places on a map: `MapPins`; a path through stops: `Route`.
- A place's photos: `Gallery` style `carousel`; its facts and amenities: `KeyValue` style `grid` with icons;
  its rating: `Scale` with `readonly`.
- A list of places: `List` (rows with distance as `value`).

## Components (6)

### `PlaceCard` · planned · content · service
A venue as a card: photo, name, category, rating, distance, price level, and "Open now" or "Closes 18:00"
in `good` or `warn`.
- Pick: one place to visit, summarised. Not a person or pet (`Profile`), not a product (commerce
  `Product`), not a rental listing (inventory `Listing`).
- Writes: `name` text(32), `category` text(20), `photo`, `rating` 0–5 optional, `distance` text(10)
  optional, `price` 1–4 optional, `open` (`open`, `closing_soon`, `closed`) optional, `goto`; `style`.
- Styles: `card` (default), `row`. · Parts → actions: `root press`. · States: filled, loading.
- Real path: place details stored with the app; distance needs location (`ok`).
- Aliases: place, venue, spot, locationcard.

### `Address` · planned · content · service
An address on two or three lines with a small map tile, and copy, directions and call buttons.
- Pick: where one place is, to get there. Not facts about a place (`KeyValue`), not a delivery's progress
  (`DeliveryTracker`).
- Writes: `lines` text(40) each, 1–3; `phone` boolean; `note` text(80) optional ("Ring the side door").
- Parts → actions: `copy press`, `directions press` (`!needs-service`), `call press`. · States: filled.
- Real path: directions open the phone's maps app. · Aliases: address, location, findus, directions.

### `Hours` · planned · data · phone
Opening hours by weekday with today in bold, "Open now · closes 18:00" at the top, and special days
(holidays) flagged.
- Pick: when a place is open. Not when bookings can be made (booking `Availability`), not staff shifts
  (team `Roster`).
- Writes: `days` of `day` (mon…sun), `from` HH:MM, `to` HH:MM, `closed` boolean, exactly 7; `special` of
  `date`, `text` text(24), 0–3.
- States: filled. · Real path: hours stored with the place; "open now" computed on the device.
- Aliases: hours, openinghours, opentimes, schedule.

### `DeliveryTracker` · planned · data · service
A delivery on its way: a map with the courier and the destination, the ETA large, the current step
(picked up, on the way, nearby, delivered), the courier's name and a call button.
- Pick: following something coming to the person. Not an order's steps without a map (commerce
  `OrderStatus`), not a path through stops (`Route`).
- Writes: `eta` text(12), `step` (`preparing`, `picked_up`, `on_the_way`, `nearby`, `delivered`), `courier`
  text(20) optional, `photo` optional.
- Parts → actions: `call press` (`!needs-service`). · States: filled, loading, success (delivered).
- Real path: live courier location from a delivery service. · Aliases: delivery, tracking, courier, eta.

### `MapList` · planned · content · service
A map on top and the same places as a list below, kept in step: tapping a pin highlights its row, scrolling
the list moves the map; a toggle switches to list only.
- Pick: browsing many places both on a map and as a list. Not up to five pins (`MapPins`), not a list with
  no map (`List`).
- Writes: `places` of `name` text(28), `meta` text(32), `distance` text(10) optional, `goto`, 1–10.
- Parts → actions: items `root press`, `view select` (map or list). · States: filled, empty, loading.
- Real path: a map service draws the map and the places' positions. · Aliases: maplist, nearby, mapview, explore.

### `Departures` · planned · data · service
The next departures from one stop: line badge, destination, minutes to go (live in `good`), and delays in
`warn`.
- Pick: when the next bus, train or ferry leaves. Not a day's plan (`Timeline`), not a journey's stops
  (`Route`).
- Writes: `stop` text(32), `rows` of `line` text(6), `to` text(28), `minutes` number, `delay` number
  optional, 1–8.
- Parts → actions: items `root press`. · States: filled, empty, loading.
- Real path: live times from a transit data service. · Aliases: departures, nextbus, transit, livetimes.

## Archetypes (3)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `places` | Places near me | `map`, `list` | Header, Search, Chips, MapList \| List |
| `place` | One place | `venue` | Header[back], Gallery[carousel], PlaceCard, Hours, Address, Button |
| `tracking` | Something on its way | `delivery`, `departures` | `delivery`: Header, DeliveryTracker, OrderStatus-free KeyValue · `departures`: Header, Departures |

## Worked example: Sniff

Dog-friendly places near the person. `places/map` shows parks and cafés in a `MapList` filtered by "water
bowl" and "off lead"; a café opens as a `place` with photos, `PlaceCard`, `Hours` ("Open now · closes
17:00") and `Address` with directions. Signature: `route_draw` on a suggested walk between two parks.

## Aliases that shadow the core

With `places`: `place`, `venue` → `PlaceCard` (otherwise `Card`); `address` → `Address` (otherwise
`KeyValue`); `hours` → `Hours`; `nearby`, `explore` → `MapList` (otherwise `MapPins`).

## Tiers

`PlaceCard` distance, `MapList`, `DeliveryTracker`, `Departures` and `Address` directions need a service or
location permission. `Hours` works on the phone.

## Build notes

- Order: `PlaceCard`, `Hours`, `Address`, `MapList`, `DeliveryTracker`, `Departures`.
- Maps share the kit's `KitMapTile` styling so `MapPins`, `MapList` and `DeliveryTracker` look like one
  family.

## Open questions

- **Weather?** In `trips` (a forecast for trip days). A place's current weather waits for misses.

# `navigation` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Active routing and mobility: turn-by-turn guidance,
route comparisons, ride-hailing dispatch/tracking, hazard reports, transit trip legs, elevation and
offline maps. Not static venues (`places`), not holiday planning (`trips`).

## Purpose

Active movement from A to B: driving, cycling, or walking with a turn-by-turn HUD and lane guidance,
comparing route alternatives across travel modes, reporting or confirming live road hazards, following
multimodal public transit legs, inspecting trail elevation and surface mixes, hailing and tracking a
rideshare or autonomous vehicle, and managing offline map downloads. Live 60fps 3D map tile rendering and
Street View stay in core `Canvas` or the host OS map engine; this pack owns the structured controls, HUD
cards, and route itineraries around them.

## Apps it serves

Turn-by-turn GPS navigator, road-hazard crowdsourcing companion, multimodal commuter transit app,
rideshare and autonomous-vehicle hailing app, cycling or hiking trail guide, offline wilderness and
road-trip map manager.

## What the core already covers

- Up to five static pins on a map: `MapPins`; a simple path of stops: `Route`.
- Venue cards, opening hours, addresses, courier maps, and single-stop departure boards: `places`
  (`PlaceCard`, `Hours`, `Address`, `DeliveryTracker`, `Departures`).
- Searching destinations and filtering options: `Search`, `Chips`, `FilterBar`.
- Saved favorite places: `List`; multi-day holiday itineraries: `trips` (`Itinerary`).
- 60fps 3D slippy map canvases, Street View panoramas, and live vector pan/zoom: core `Canvas`.

`TurnGuidance` stays for active maneuver HUDs, lane pills, and live speed limits; `RouteOptions` for
side-by-side mode and toll/ferry comparisons before starting; `ElevationProfile` for route altitude curves
and surface shares; `RideSelector` and `RideTracker` for vehicle-tier dispatch and active rideshare/AV
tracking; `TrafficReport` for live hazard verification and submission; `TransitJourney` for step-by-step
multimodal transit legs; and `OfflineMaps` for regional download storage.

## Components (8)

### `TurnGuidance` · planned · data · service
Active navigation HUD banner and ETA footer showing the next maneuver arrow, distance to turn, street or
highway exit name, highlighted lane pills, current speed versus posted speed limit, and remaining trip
time and distance. Controls let the driver mute voice prompts, request a reroute, inspect upcoming turns,
or confirm ending guidance.
- Pick: active turn-by-turn maneuver guidance and live ETA bar during an ongoing trip. Not 60fps 3D GL
  map tiles (`Canvas`), not comparing alternative routes before starting (`RouteOptions`), not static stops
  (`Route`).
- Writes: `maneuver` (`left`, `right`, `sharp_left`, `sharp_right`, `slight_left`, `slight_right`,
  `straight`, `uturn`, `roundabout`, `merge`, `exit`, `arrive`), `turnMeters` number ≥ 0, `street`
  text(40), `exit` text(12) optional, `lanes` of `direction` (`left`, `straight`, `right`), `active`
  boolean, 0–6; `speedLimit` number > 0 optional, `unit` (`mph`, `kmh`), `remainingMinutes` number ≥ 0,
  `remainingMeters` number ≥ 0, `muted` boolean (default false), `style`. Current speed and ETA clock time
  are supplied by live GPS/routing telemetry, never model-written.
- Styles: `hud` (default, full maneuver banner with lane pills, speed badge, and ETA footer), `compact`
  (slim top maneuver banner and remaining time/distance strip).
- Parts → actions: `mute toggle`, `reroute press`, `expand press`, `stop press`.
  `meta.confirmParts: ["stop"]`.
- States: filled, loading (recalculating route), success (arrived at destination), error (GPS or routing
  signal lost).
- Real path: live device GPS (`ok`) paired with a routing telemetry service (`service`) updating distances,
  speed limits, and ETA.

### `RouteOptions` · planned · data · service
Travel-mode switcher (`drive`, `transit`, `walk`, `bike`) above 2–4 comparable route option cards showing
an optional route preview tile, duration, distance, traffic delay tone (`good`, `warn`, `bad`), toll or
ferry tags, transit transfer counts, and a Start trigger. Selecting a mode or route previews its path and
updates the start target.
- Pick: comparing alternative routes and travel modes before starting navigation. Not one linear chain of
  stops (`Route`), not active turn-by-turn HUD (`TurnGuidance`), not single-stop departures (places
  `Departures`).
- Writes: `destination` text(40), `modes` subset of (`drive`, `transit`, `walk`, `bike`), `mode` (`drive`,
  `transit`, `walk`, `bike`), `routes` of `routeId` text(24), `label` text(32), `minutes` number > 0,
  `meters` number > 0, `delayTone` (`good`, `warn`, `bad`), `tags` subset of (`fastest`, `no_tolls`,
  `ferry`, `scenic`, `accessible`), `transfers` number 0–6 optional, `selected` index (default 0), `goto`
  (active guidance screen), 1–4; `style`. Arrival clock times and mode travel times are supplied by the
  routing service.
- Styles: `cards` (default, mini map preview with route cards), `list` (compact comparison rows without a
  map tile).
- Parts → actions: `mode select`, routes `root select`, `start press` (goes to `goto`).
- States: filled, empty (no route found for mode), loading, error (routing service unavailable).
- Real path: destination coordinates resolved against a multi-modal routing service (`service`) computing
  travel times, tolls, and traffic delays.

### `ElevationProfile` · planned · data · phone
Distance-versus-elevation line plot (`KitLinePlot`) displaying climb gradients, tapped waypoint altitude
and grade percentage readouts, summary figures for total ascent, total descent, and maximum grade, and a
surface-type share bar (`KitShare`) splitting paved, gravel, trail, and other segments.
- Pick: inspecting terrain elevation changes and surface mix along a cycling, running, or hiking route.
  Not body measurements (health `Measurements`), not business charts (data `LineChart`), not turn-by-turn
  maneuvers (`TurnGuidance`).
- Writes: `routeName` text(32), `samples` of `km` number ≥ 0, `elevationM` number, 4–40; `surfaces` of
  `kind` (`paved`, `gravel`, `trail`, `other`), `percent` number 0–100, 1–4; `unit` (`metric`, `imperial`),
  `selected` index optional, `style`. Total ascent, total descent, max grade %, tapped waypoint grade, and
  normalized surface shares are computed by code.
- Styles: `full` (default, elevation curve, climb stats, and surface share bar), `compact` (elevation
  curve and total climb only).
- Parts → actions: samples `root select` (inspects altitude and grade at that distance).
- States: filled, empty, loading.
- Real path: elevation points and surface tags stored in a local GPX/route record on the phone; fetching
  remote terrain tiles uses a map elevation service (`service`).

### `RideSelector` · planned · input · service
Pickup-to-dropoff summary header above 2–5 selectable ride-hailing vehicle tiers (`Standard`, `Comfort`,
`XL`, `Green`, `Autonomous`) displaying seat capacity, pickup ETA, surge multiplier tag when active, and
estimated fare alongside a Request Ride trigger. Unavailable vehicle classes stay dimmed and unselectable.
- Pick: selecting a ride-hailing or autonomous vehicle tier and estimated fare before dispatch. Not
  appointment time slots (booking `Slots`), not retail product variants (commerce `VariantPicker`), not
  self-drive route comparisons (`RouteOptions`).
- Writes: `pickup` text(40), `dropoff` text(40), `tiers` of `tierId` text(24), `name` text(20), `kind`
  (`standard`, `comfort`, `xl`, `green`, `autonomous`), `seats` number 1–8, `etaMinutes` number 1–60,
  `fareMin` number > 0, `fareMax` number ≥ `fareMin` optional, `surge` number ≥ 1 optional, `available`
  boolean (default true), 2–5; `selected` index (default 0), `paymentLabel` text(24), `goto` (live ride
  tracker), `style`. Fares format with `moneyLine` in the brief's currency; unavailable tiers disable
  selection.
- Styles: `list` (default, tier rows with vehicle icon, ETA, seat count, and fare), `compact` (tight
  tier rows with Request trigger).
- Parts → actions: tiers `root select` (available only), `swap press` (swap pickup and dropoff),
  `request press` (dispatches ride and opens `goto`).
- States: filled, empty (no vehicles available nearby), loading, error (quote expired or dispatch failed).
- Real path: real-time vehicle supply, surge pricing, and ride dispatch via a ride-hailing service
  (`service`).

### `RideTracker` · planned · data · service
Live ride status card tracking stages (`matching`, `arriving`, `in_ride`, `completed`, `cancelled`) with a
mini map tile, driver portrait and star rating (or autonomous vehicle badge), car model, color, and license
plate, optional pickup PIN, call/message/share-trip safety controls, and autonomous vehicle unlock and
honk actions when arriving.
- Pick: following an active rideshare or autonomous vehicle pickup and trip in progress. Not choosing a
  vehicle tier (`RideSelector`), not food or parcel courier maps (places `DeliveryTracker`), not static
  travel confirmations (trips `Reservation`).
- Writes: `stage` (`matching`, `arriving`, `in_ride`, `completed`, `cancelled`), `etaMinutes` number ≥ 0
  optional, `vehicleKind` (`driver`, `autonomous`), `driverName` text(24) optional, `rating` number 1–5
  optional, `avatar` photo optional, `vehicle` text(32), `color` text(16), `plate` text(12), `pin` text(6)
  optional, `pickup` text(40), `dropoff` text(40), `style`. Code enables `unlock` and `honk` only when
  `vehicleKind` is `autonomous` and `stage` is `arriving`, and allows `cancel` only before `in_ride`.
- Styles: `live` (default, mini map, status steps, vehicle card, and action bar), `compact` (status,
  plate, ETA, and safety actions).
- Parts → actions: `call press`, `message press`, `share press`, `safety press`, `unlock press`,
  `honk press`, `cancel press`. `meta.confirmParts: ["cancel"]`.
- States: filled, loading (matching vehicle), success (arrived or completed), error (ride cancelled or
  connection lost).
- Real path: live vehicle GPS stream, driver/AV telemetry, and trip controls from a ride-hailing service
  (`service`).

### `TrafficReport` · planned · input · service
Crowdsourced road-incident module displaying either an ahead-alert confirmation card ("Police 0.4 mi ahead ·
Still there?" with Still There and Not There buttons) or a quick-tap hazard tile grid (`Traffic`, `Police`,
`Crash`, `Hazard`, `Closure`, `Construction`) with side-of-road toggle (`my_side`, `other_side`).
- Pick: verifying an upcoming road alert or reporting a live traffic hazard while navigating. Not general
  app shortcuts (`Actions`), not health symptoms (health `SymptomLog`), not venue listings (`PlaceCard`).
- Writes: `activeAlert` of `alertId` text(24), `kind` (`traffic`, `police`, `crash`, `hazard`, `closure`,
  `construction`), `distanceText` text(16), `reportedAgo` text(16) optional; `categories` subset of
  (`traffic`, `police`, `crash`, `hazard`, `closure`, `construction`), `side` (`my_side`, `other_side`),
  `style`. Code dismisses active alerts on verification and binds new submissions to current GPS telemetry.
- Styles: `grid` (default, 6-tile quick hazard grid with side toggle), `prompt` (focused single-alert
  verification banner with Yes and Dismiss actions).
- Parts → actions: `confirm press` ("Still there"), `clear dismiss` ("Not there"), tiles `root press`,
  `side select`.
- States: filled, empty, loading, success (report submitted), error (location unavailable or submit
  failed).
- Real path: reads device location (`ok`) and exchanges crowdsourced road hazard reports with a live
  traffic service (`service`).

### `TransitJourney` · planned · data · service
Step-by-step multimodal transit itinerary detailing walking legs with minutes, transit legs with line
badges, headsign, stop count, live crowding and step-free accessibility pills, transfer wait times, and a
live "Get off next stop" alert banner on the active leg.
- Pick: guiding a traveler step by step across multimodal public transit legs and transfers. Not a single
  stop's departure board (places `Departures`), not holiday plans across days (trips `Itinerary`), not car
  turn-by-turn HUD (`TurnGuidance`).
- Writes: `summary` text(40), `departureTime` HH:MM, `arrivalTime` HH:MM, `legs` of `kind` (`walk`, `bus`,
  `rail`, `metro`, `ferry`, `tram`), `line` text(8) optional, `headsign` text(32) optional, `boardStop`
  text(28) optional, `alightStop` text(28) optional, `stops` number 1–60 optional, `minutes` number 1–240,
  `waitMinutes` number 0–60 optional, `crowding` (`low`, `medium`, `high`) optional, `accessible` boolean
  optional, `status` (`on_time`, `delayed`, `cancelled`) optional, 1–6; `activeLeg` index optional,
  `alightAlert` boolean (default false), `style`. Total journey time and live delay badges update from leg
  records and real-time transit feeds.
- Styles: `itinerary` (default, expandable leg chain with line badges, stops, and crowding pills), `live`
  (pins active leg at top with next-stop alight alert).
- Parts → actions: legs `root toggle` (expand intermediate stops), `alert toggle` (get-off reminder),
  `refresh press`. `meta.partTiers: { alert: "ok" }`.
- States: filled, empty, loading, error (transit feed disconnected).
- Real path: GTFS-RT transit routing and crowding feeds (`service`) paired with optional local notification
  permission (`ok`) for alighting reminders.

### `OfflineMaps` · planned · input · phone
Offline map region manager displaying a device storage meter bar, a Wi-Fi-only download toggle, and up to
six region rows (with "and N more" beyond) showing area name, MB footprint, update date, status badge
(`available`, `downloading`, `up_to_date`, `update_due`), active progress bar, and Download, Update, or
Delete controls.
- Pick: downloading, updating, or deleting offline map regions for signal-free routing. Not travel
  passports/visas (trips `TravelDocs`), not physical storage boxes (inventory `Storage`), not document
  attachments (`FileList`).
- Writes: `usedMb` number ≥ 0, `totalMb` number > 0, `wifiOnly` boolean (default true), `regions` of
  `regionId` text(24), `name` text(32), `sizeMb` number > 0, `updatedAt` date optional, `status`
  (`available`, `downloading`, `up_to_date`, `update_due`), `progress` number 0–1 optional, 1–6; `style`.
  Used storage percentage and pending update counts are computed by code.
- Styles: `manager` (default, storage bar, Wi-Fi switch, and region rows), `compact` (downloaded regions
  only).
- Parts → actions: `wifi toggle`, regions `download press`, regions `update press`, regions `delete press`.
  `meta.confirmParts: ["delete"]`; `meta.partTiers: { download: "service", update: "service" }`.
- States: filled, empty, loading, success (region downloaded or deleted), error (insufficient storage or
  download interrupted).
- Real path: vector map bundles stored on the phone (`phone`); fetching new or updated region packs pulls
  from a map tile service (`service`).

## Archetypes (5)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `nav_active` | Active driving guidance and crowdsourced road hazard reports | `navigation_active`, `navigation_incidents` | `navigation_active`: Header[back], TurnGuidance, TrafficReport[prompt] · `navigation_incidents`: Header[back], TrafficReport[grid], Note, Button |
| `route_plan` | Compare multi-mode routes and follow multimodal transit trips | `navigation_compare`, `navigation_transit` | `navigation_compare`: Header, Search, RouteOptions, Button · `navigation_transit`: Header[back], TransitJourney[live], Note, Button |
| `ride_hail` | Pick a vehicle tier and follow a live rideshare or AV trip | `navigation_ride_pick`, `navigation_ride_live` | `navigation_ride_pick`: Header, Search, RideSelector, Note · `navigation_ride_live`: Header[back], RideTracker, KeyValue, Button |
| `trail_guide` | Inspect trail path, elevation profile, and surface mix | `navigation_elevation` | Header[back], Route, ElevationProfile, Stats |
| `offline_areas` | Manage downloadable offline map regions | `navigation_offline` | Header, Search, OfflineMaps, Note |

Each archetype's `defaultLayout` is its first listed layout; all layout ids are `navigation_`-prefixed and
unique. Recipes use only core plus `navigation`, stay between 3 and 4 non-overlay components, and keep
screen weight at or below 7 with zero dense weight-3 blocks.

## Worked example: Wayfinder (mobility & navigation)

A daily commuter and weekend cyclist opens Wayfinder. `route_plan/navigation_compare` compares a 24-minute
toll-free drive against a 32-minute transit alternative; starting the drive opens
`nav_active/navigation_active` with `TurnGuidance` showing right-lane pills for Exit 14 and a live
`TrafficReport[prompt]` verifying a hazard ahead. On Friday evening, `ride_hail/navigation_ride_pick`
selects an Autonomous tier (`$14–16`, `4 min`) and transitions to `navigation_ride_live` with an AV unlock
button upon arrival. Saturday's gravel ride loads `trail_guide/navigation_elevation` showing `Route`, 640 m of
ascent on `ElevationProfile`, and `62% gravel / 38% paved` after pre-downloading the valley in
`offline_areas/navigation_offline`. Signature: core `route_draw` on `Route`.

## Tiers

`ElevationProfile` and stored `OfflineMaps` regions run on `phone`; downloading or updating map regions
requires `service`. `TurnGuidance`, `TrafficReport`, `TransitJourney`, `RouteOptions`, `RideSelector`, and
`RideTracker` depend on live routing, traffic, transit, or dispatch `service` feeds (and device location
`ok` for GPS positioning and `TransitJourney` alight alerts).

## Build notes

- Order: `RouteOptions`, `TurnGuidance`, `TrafficReport`, `TransitJourney`, `RideSelector`, `RideTracker`,
  `ElevationProfile`, `OfflineMaps`.
- Reuse `KitMapTile`, `KitRouteStop`, `KitLinePlot`, `KitShare`, and `KitStepsTrack`; no new kit base or
  signature moment is required.
- Distance and speed units follow the brief (`km`/`kmh` or `mi`/`mph`); fares format with `moneyLine` in
  the brief's currency.
- Never render a 60fps interactive slippy map inside declarative components; reserve continuous pan/zoom GL
  tiles for `Canvas`.
- Keep `places` (`PlaceCard`, `Address`, `Hours`, `Departures`) and `trips` (`Itinerary`, `Reservation`)
  as distinct sibling packs with zero pack-to-pack imports.

## Open questions

- **New actions?** None. Mute, alert, wifi, reroute, start, call, unlock, download, and stop map to
  `toggle`, `press`, `select`, and `dismiss`.
- **Voice navigation audio?** Handled as a host TTS/audio cue triggered alongside `TurnGuidance` telemetry
  with the declared `mute toggle` control.

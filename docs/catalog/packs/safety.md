# `safety` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Personal and family location safety: live circle maps,
geofence place alerts, driving behavior summaries, hold-to-trigger SOS beacons and timed check-ins. Not
venues/delivery (`places`), not pregnancy/screen limits (`parenting`).

## Purpose

Trusted personal and family safety coordination: sharing live locations and phone battery status within a
closed circle, managing geofence place arrival and departure alerts, reviewing driving safety scores and
harsh-event trips, holding an SOS emergency beacon, and running timed check-ins with automatic overdue
contact escalation. It coordinates safety across consenting people, not public place directories, medical
care, or parental screen-time controls.

## Apps it serves

Family safety circle locator, solo evening-walk check-in companion, teen driver safety tracker, household
SOS emergency alert app, solo-traveler check-in beacon.

## What the core already covers

- Circle member list or overlapping avatar stack: `People`; circle chat: `Bubbles` + `Composer[reply]`.
- Static non-live pins: `MapPins`; safety summary KPIs: `Stats`; weekly safe-driver target: `Progress[ring]`.
- Urgent safety notices: `Banner`; alert history: `Timeline[history]`; emergency contact facts: `KeyValue`.

`CircleMap` displays live member pins with movement state, battery %, and last-seen times; `PlaceAlerts`
adds geofence radii and per-member arrive/leave notification switches; `DriveSummary` calculates driving
behavior scores and harsh-event counts; `SosBeacon` enforces a press-and-hold radial trigger (`KitHoldButton`)
for emergency broadcasts; `SafetyCheckIn` manages timed arrival check-ins with automatic overdue escalation.

## Components (5)

### `CircleMap` · planned · content · service
Stylised live circle map plotting trusted member avatar pins over normalized coordinates above member status
cards showing current place or movement state, battery percentage pill, and last-seen timestamp. Tapping a
member highlights their pin on the map; tapping directions opens external navigation with location permission.
- Pick: tracking trusted circle members' live locations, movement states, and phone battery levels. Not static
  five-pin venues (`MapPins`), venue search (`places/MapList`), or courier deliveries (`places/DeliveryTracker`).
- Writes: `circleName` text(28), `members` of `memberId` text(24), `name` text(24), `photo` optional, `x`
  number 0–1, `y` number 0–1, `place` text(28), `moving` (`still`, `walking`, `driving`, `unknown`),
  `battery` int 0–100, `updatedAt` ISO datetime with offset, `goto` optional, 1–6; `selectedId` text(24)
  optional; `style`. Low-battery warning tone (≤ 15%) and relative elapsed age from `updatedAt` are computed
  by code.
- Styles: `map` (default, live avatar map above member status rows), `cards` (selected member detail strip
  under a compact map).
- Parts → actions: members `root select`, `directions press`, `refresh press`.
  `meta.partTiers: { directions: "ok" }`.
- States: filled, empty (no circle members added yet), loading, error (location feed unavailable).
- Real path: live member coordinates and battery states synced through a circle location service with mutual
  consent; requesting directions uses location permission (`ok`) and the OS map handler.

### `PlaceAlerts` · planned · input · service
Named geofence zones (`Home`, `School`, `Work`) displaying address summary, radius label, per-member arrive
and leave notification toggles, and most recent trigger timestamp. Toggling rules updates geofence alerts;
removing a monitored zone asks for confirmation first.
- Pick: configuring arrival and departure alerts for trusted geofences. Not static venue details
  (`places/Address`), smart-home room devices (`home/Devices`), or staff shift locations (`team/Shift`).
- Writes: `places` of `placeId` text(24), `name` text(24), `address` text(48), `radiusMeters` int 50–2000,
  `alerts` of `memberId` text(24), `name` text(20), `onArrive` boolean, `onLeave` boolean, 1–4, `lastEvent`
  text(36) optional, `goto` optional, 1–6; `addGoto` optional; `style`. Enabled alert counts per zone are
  computed by code.
- Styles: `zones` (default, expandable zone cards with member toggles), `history` (recent arrival/departure
  events per place).
- Parts → actions: places `root press` (opens `goto`), alerts `arrive toggle`, alerts `leave toggle`,
  places `remove press`, `add press` (opens `addGoto`). `meta.confirmParts: ["remove"]`.
- States: filled, empty (no geofences configured), loading, success (alert rules saved), error (geofence
  sync failed).
- Real path: geofence coordinates and per-member notification preferences synced with a background geofence
  and push-notification service (OS location permission `ok` required during zone setup).

### `DriveSummary` · planned · data · service
Recent trip cards showing origin and destination labels, distance, duration, top speed, event count pills
(hard braking, rapid acceleration, phone interaction), and a computed weekly safe-driver score. Tapping a
trip opens detailed trip context when linked; sharing a summary sends to the circle (`people`).
- Pick: reviewing driving behavior metrics, harsh-event counts, and weekly safe-driver scores. Not plotting
  one route (`Route`), logging fill-ups/EV charging (`auto/FuelLog`), or running cardio workouts (`health/CardioSession`).
- Writes: `driverName` text(24), `period` text(20), `unit` (`mi`, `km`), `trips` of `tripId` text(24),
  `fromLabel` text(24), `toLabel` text(24), `startedAt` ISO datetime with offset, `minutes` int 1–600,
  `distance` number > 0, `topSpeed` int 0–200, `hardBrakes` int 0–50, `rapidAccels` int 0–50, `phoneUses`
  int 0–50, `goto` optional, 1–6; `style`. Weekly safe-driver score (0–100), total distance, and total events
  are computed by code from trip records, never written by the model.
- Styles: `trips` (default, weekly score header above trip cards), `compact` (condensed trip summary rows).
- Parts → actions: trips `root press` (opens `goto`), `share press`. `meta.partTiers: { share: "people" }`.
- States: filled, empty (no recorded drives in period), loading, error (drive telemetry unavailable).
- Real path: motion and GPS trip telemetry processed into scored safety summaries by a driving-analytics
  service; circle sharing respects each driver's explicit privacy toggle.

### `SosBeacon` · planned · action · service
Hold-to-trigger SOS emergency alert centered on a press-and-hold radial countdown ring (`KitHoldButton`),
listing the emergency contacts who will be notified, a silent-vs-audible alert toggle, and an active
broadcast banner once triggered. Requiring a continuous 3-second hold prevents accidental pocket triggers;
cancelling an active broadcast requires confirmation.
- Pick: triggering or cancelling an emergency SOS broadcast to trusted contacts. Not a single-tap button
  (`Button`), a passive status alert (`Banner`), or a dating check-in (`dating/SafetyPass`).
- Writes: `active` boolean (default false), `silent` boolean (default false), `holdSeconds` int 2–5
  (default 3), `contacts` of `contactId` text(24), `name` text(24), `relation` text(16) optional, 1–6,
  `triggeredAt` ISO datetime with offset optional, `note` text(80) optional, `style`. Radial hold progress
  and active broadcast elapsed clock are host-owned runtime state.
- Styles: `standby` (default, hold button, silent toggle, and emergency contact list), `broadcast` (urgent
  active SOS banner, live location cue, and confirmed cancel control).
- Parts → actions: `sos press` (fires only after full continuous hold on `KitHoldButton`), `silent toggle`,
  `cancel press` (active broadcast only). `meta.confirmParts: ["cancel"]`; `meta.partTiers: { sos: "ok" }`.
- States: filled (standby), success (SOS broadcast active), loading (sending alerts), error (broadcast
  failed; show local call cue).
- Real path: `KitHoldButton` dispatches `sos press` after continuous press duration to send location (`ok`
  permission) and emergency SMS/push alerts via the safety service; never silently dials public 911/112.

### `SafetyCheckIn` · planned · action · people
One-tap timed safety check-in beacon ("Walking home", "Night run") displaying activity label, expected
arrival clock, selected circle contacts, live countdown bar, "+15m" extend button, and "I'm Safe" completion
control. Missing the deadline transitions automatically to an overdue escalation warning notifying named contacts.
- Pick: starting a timed personal safety check-in with automatic overdue contact escalation. Not event ticket
  check-ins (`events/Door`), social RSVPs (`social/EventCard`), or standalone countdown timers (`Timer`).
- Writes: `status` (`idle`, `active`, `arrived`, `overdue`), `label` text(32), `minutes` int 5–240,
  `startedAt` ISO datetime with offset optional, `contacts` of `contactId` text(24), `name` text(24), 1–6,
  `note` text(80) optional, `style`. Expected arrival time, countdown remaining, and overdue escalation state
  are computed by code from `startedAt`, `minutes`, and the host clock.
- Styles: `beacon` (default, active countdown, extend +15m, and "I'm Safe" action), `quick` (preset check-in
  launch card).
- Parts → actions: `start press` (idle), `arrive press` (active or overdue), `extend press` (active only),
  `cancel press`. `meta.confirmParts: ["cancel"]`; `meta.partTiers: { start: "ok" }`.
- States: empty (no active check-in), filled (active timer), success (arrived safe), loading, error
  (notification escalation failed).
- Real path: shared safety timer backed by a notification service that attaches a start location (`ok`) and
  alerts listed contacts only if `arrive press` is not recorded before expiry.

## Archetypes (3)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `safety_circle` | Live circle locations and geofence alerts | `safety_map`, `safety_places` | `safety_map`: Header, CircleMap, Banner, Actions · `safety_places`: Header, Search, PlaceAlerts, Button |
| `safety_driving` | Driving behavior scores and trip events | `safety_reports` | `safety_reports`: Header, Stats, DriveSummary, Note |
| `safety_sos` | Emergency SOS beacon and timed check-ins | `safety_beacon`, `safety_checkin` | `safety_beacon`: Header, SosBeacon, KeyValue · `safety_checkin`: Header, SafetyCheckIn, People[stack], Note |

Defaults: `safety_circle/safety_map`, `safety_driving/safety_reports`, `safety_sos/safety_beacon`. Layout ids
are `safety_`-prefixed and unique across the catalog. Recipes use only core plus `safety` and stay within
weight 12.

## Worked example: HarborCircle

A family and solo-commuter safety app, separate from Ledge's plant care and Trot's dog walking. On
`safety_circle/safety_map`, `CircleMap` plots four family members across normalized coordinates with battery
pills (flagging Maya at 12% in warning tone) and status rows (`At School`, `Driving · 42 mph`), while
`safety_circle/safety_places` toggles arrive/leave alerts for Home and Oakridge High. On
`safety_driving/safety_reports`, `DriveSummary` scores three weekly trips from raw brake, acceleration, and
phone-use counts. For evening commutes, `safety_sos/safety_checkin` starts a 25-minute `SafetyCheckIn`, and
`safety_sos/safety_beacon` mounts `SosBeacon` with a 3-second `KitHoldButton` standby trigger. Signature: none
required; motion follows reduced-motion rules across hold and alert states.

## Tiers

`CircleMap`, `PlaceAlerts`, `DriveSummary`, and `SosBeacon` require an outside safety/push `service` for
live sync and alerts; `SafetyCheckIn` is `people` (with `start` marked `ok` for location snapshot).
Location-dependent actions (`CircleMap.directions`, `SosBeacon.sos`, `SafetyCheckIn.start`) read `!needs-ok`;
`DriveSummary.share` reads `!needs-people`. No silent background tracking without OS consent is implied.

## Build notes

- Order: `CircleMap`, `PlaceAlerts`, `SafetyCheckIn`, `DriveSummary`, `SosBeacon`; all remain planned.
- Build wave-6 base `KitHoldButton` (press-and-hold radial countdown trigger) before `SosBeacon`; extend
  `KitMapTile` avatar/battery pin rendering (not a separate new base) for `CircleMap`.
- Writers use strict `writerFormat(registry)` for core plus selected packs only; no aliases or off-pack ids.
  Never write computed safety scores, elapsed timestamps, or arrival deadlines in model output.
- One shared circle store links `CircleMap`, `PlaceAlerts`, `SafetyCheckIn`, and `SosBeacon` contacts.
- All lists cap at 6 items with shared overflow copy; destructive actions (`remove`, `cancel`) confirm via
  `meta.confirmParts`.

## Open questions

- **New action names?** None. Hold completion on `KitHoldButton` dispatches `press` after the required
  continuous hold duration; arrive, extend, cancel, refresh, directions, and share use `press`; alert and
  silent switches use `toggle`; map pins use `select`.
- **Automatic crash detection or 911 calling?** Default: out of scope; emergency dialing and hardware
  accelerometer crash-detection SDKs require native OS integration outside declarative schemas.
- **Safety signature?** Default: none proposed; hold ring progress uses standard kit motion tokens.

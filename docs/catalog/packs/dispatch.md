# `dispatch` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Gig-economy courier and driver operations: online
status/zone demand, timed offer acceptance, pickup/dropoff proof, and shift payout breakdowns. Not employer
staff shifts (`team`), not buyer delivery maps (`places`).

## Purpose

Independent gig-economy courier and driver operations: going online or pausing in a delivery zone, finding
high-demand areas and scheduled blocks, accepting or declining time-bounded job offers, completing verified
pickup and dropoff handoffs (checklists, photo proof, or PIN), and tracking shift payouts with instant cashout.
It serves independent contractors during active shifts, not W-2 employer rosters, buyer parcel maps, or tax books.

## Apps it serves

Food and grocery delivery courier app, gig rideshare driver hub, same-day parcel block driver companion,
independent local runner dispatch console.

## What the core already covers

- Headline shift payout: `Amount[large]`; trip/earning summary counters: `Stats`; daily log: `Timeline[day]`.
- Weekly shift comparison: `Bars`; pre-shift vehicle prep: `Checklist`; navigation leg path: `Route`.
- Customer chat: `Bubbles` + `Composer[reply]`; proof photo capture: `Camera[photo]`; alerts: `Banner`.

`DriverStatus` manages online/offline/paused dispatch states and transport mode; `OfferCard` owns time-bounded
offer acceptance with expiring countdown bars; `StopHandoff` verifies pickup/dropoff items, gate notes, PINs,
and photo proof; `PayoutBreakdown` separates base pay, tips, surge bonuses, active vs online time, and instant
cashouts; `ZoneDemand` displays area busyness and peak pay zones/blocks.

## Components (5)

### `DriverStatus` · planned · action · ok
Online, Offline, and Pause availability control bar displaying the active delivery zone name, live busyness
pill, transport mode selector (`car`, `bike`, `scooter`, `walk`), completed shift trips, and running shift
earnings. Going online checks location permission (`ok`) and connects to the dispatch network (`service`).
- Pick: managing a gig courier's online/offline/paused availability and shift status bar. Not W-2 employer
  clock-in (`team/TimeClock`), service appointment hours (`booking/Availability`), or family GPS (`safety/CircleMap`).
- Writes: `status` (`offline`, `online`, `paused`), `zoneName` text(24), `busyness` (`quiet`, `steady`,
  `busy`, `very_busy`), `mode` (`car`, `bike`, `scooter`, `walk`), `tripsCompleted` int 0–200, `shiftEarned`
  number ≥ 0 (projected by code from completed host offer records when present), `pausedUntil` HH:MM optional,
  `style`. Formatted earnings come from `moneyLine` and the brief's currency.
- Styles: `bar` (default, compact top control bar with online toggle and zone pill), `dash` (expanded shift
  card with mode selector and running counters).
- Parts → actions: `online toggle`, `pause toggle`, `mode select`. `meta.partTiers: { online: "service" }`.
- States: filled (online or paused), empty (offline), loading (connecting), error (location or dispatch link
  unavailable).
- Real path: uses location permission (`ok`) and dispatch service status (`service`) to register courier
  availability; shift trip counts and earnings reflect committed host completions.

### `OfferCard` · planned · action · service
Time-bounded incoming job offer card showing guaranteed payout, tip-included indicator, total distance,
estimated duration, pickup merchant and dropoff area names, stop and item counts, an expiring countdown
progress bar, and Accept or Decline controls. Once the countdown hits zero, Accept locks and the offer closes.
- Pick: accepting or declining a time-bounded gig job offer before its timer expires. Not W-2 open shifts
  (`team/OpenShift`), booked appointments (`booking/Appointment`), or buyer auctions (`marketplace/Auction`).
- Writes: `offerId` text(24), `guaranteedPay` number > 0, `includesTip` boolean (default true), `distance`
  number > 0, `unit` (`mi`, `km`), `estMinutes` int 1–180, `pickupName` text(28), `dropoffArea` text(28),
  `stops` int 1–6 (default 1), `itemsCount` int 1–99, `expiresAt` ISO datetime with offset, `status`
  (`pending`, `accepted`, `declined`, `expired`), `style`. Seconds remaining, pay-per-distance ratio, and
  expiry lock are computed by code from `expiresAt` and the host clock.
- Styles: `offer` (default, full incoming offer card with countdown bar), `compact` (tight offer summary).
- Parts → actions: `accept press`, `decline press`. `meta.confirmParts: ["decline"]`.
- States: filled (pending offer), loading (claiming job), success (offer accepted), error (expired or claimed).
- Real path: server-pushed dispatch offer with a strict expiry timestamp; accepting claims the job on the
  dispatch server and opens `StopHandoff`.

### `StopHandoff` · planned · input · ok
Active pickup or dropoff execution card showing stop type (`pickup` or `dropoff`), merchant or customer name,
masked delivery address, gate/dropoff notes, up to six checklist items, customer contact actions (`service`),
photo-proof (`photoGoto` -> `Camera`) or 4-digit PIN verification field, and Complete Stop. Completion stays
disabled until required items and proof are fulfilled.
- Pick: verifying items, customer notes, photo proof, or handoff PIN at an active courier stop. Not buyer
  delivery maps (`places/DeliveryTracker`), retail packing (`commerce/OrderStatus`), or service repair orders
  (`requests/WorkOrder`).
- Writes: `stopId` text(24), `kind` (`pickup`, `dropoff`), `partyName` text(28), `address` text(48),
  `notes` text(120) optional, `items` of `label` text(32), `checked` boolean, 1–6, `proofMode` (`none`,
  `photo`, `pin`), `pinExpected` secret(6) optional (`pin` mode only), `photoRef` text(120) optional
  (host-written from `Camera`), `photoGoto` optional, `completed` boolean (default false), `style`.
  Completion eligibility is computed by code; `pinExpected` is masked as `(secret)` in reads.
- Styles: `active` (default, full verification checklist, notes, proof, and complete button), `summary`
  (completed handoff proof card).
- Parts → actions: items `check check`, `call press`, `message press`, `photo press` (opens `photoGoto`),
  `pin type`, `complete press`. `meta.partTiers: { call: "service", message: "service" }`.
- States: filled, loading, success (stop verified and completed), error (PIN mismatch or proof upload failed).
- Real path: local stop verification using device camera (`ok`) or recipient PIN; completion commits proof to
  the dispatch service.

### `PayoutBreakdown` · planned · data · phone
Completed shift or trip earnings breakdown displaying base pay, customer tips, peak/surge bonus, adjustments,
active driving time vs total online time, up to six recent trip payout rows, and an optional instant cashout
button. Code computes total pay, tip share, effective hourly rate, and net cashout after any fee.
- Pick: breaking down gig shift pay into base, tips, bonuses, active vs online time, and instant cashouts.
  Not W-2 employee paystubs (`team/PayStub`), SMB payroll runs (`books/Payroll`), or P&L (`books/ProfitLoss`).
- Writes: `periodLabel` text(24), `basePay` number ≥ 0, `tips` number ≥ 0, `bonusPay` number ≥ 0,
  `adjustments` signed number (default 0), `activeMinutes` int 0–1440, `onlineMinutes` int 0–1440
  (`activeMinutes` ≤ `onlineMinutes`), `trips` of `tripId` text(24), `label` text(28), `time` HH:MM,
  `earned` number ≥ 0, `goto` optional, 0–6, `cashoutAvailable` boolean (default true), `cashoutFee` number
  ≥ 0 (default 0), `style`. Total earnings, tip share, hourly rate, and net cashout are computed by code.
- Styles: `shift` (default, pay components, active/online clock comparison, and cashout CTA), `trips`
  (focused trip-by-trip payout list).
- Parts → actions: trips `root press` (linked rows), `cashout press` (when `cashoutAvailable` is true).
  `meta.confirmParts: ["cashout"]`; `meta.partTiers: { cashout: "service" }`.
- States: filled, empty (no completed trips in period), loading, success (cashout initiated), error (payout
  failed).
- Real path: completed trip ledger stored on the device using `moneyLine`; instant cashout requests transfer
  through a payment service without storing bank credentials in model props.

### `ZoneDemand` · planned · content · ok
Delivery zone and block cards showing area name, live busyness badge (`quiet`, `steady`, `busy`, `very_busy`),
peak pay bonus per order (`+3`), optional block window, distance from driver, and Dash Now or Schedule Block
controls. Code sorts busiest/highest-bonus zones first and formats bonus values with `moneyLine`.
- Pick: choosing high-demand gig delivery zones or reserving upcoming delivery blocks. Not customer venues
  (`places/PlaceCard`), staff open shifts (`team/OpenShift`), or weather maps (`weather/WeatherLocations`).
- Writes: `zones` of `zoneId` text(24), `name` text(28), `busyness` (`quiet`, `steady`, `busy`, `very_busy`),
  `peakBonus` number ≥ 0, `blockWindow` text(24) optional, `scheduled` boolean (default false), `distance`
  number ≥ 0 optional, `unit` (`mi`, `km`), `goto` optional, 1–6; `style`. Sort order and formatted peak pay
  come from code.
- Styles: `zones` (default, live busyness cards with Dash Now), `blocks` (upcoming scheduled block cards).
- Parts → actions: zones `root press` (opens `goto`), zones `dash press`, zones `schedule toggle`.
  `meta.partTiers: { dash: "service", schedule: "service" }`.
- States: filled, empty (no active zones in range), loading, success (block reserved or shift started), error
  (zone full or network error).
- Real path: uses location permission (`ok`) to list nearby zones and commits block reservations or go-online
  requests through the dispatch service.

## Archetypes (3)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `dash_home` | Go online and pick busy delivery zones | `dispatch_online`, `dispatch_zones` | `dispatch_online`: Header, DriverStatus, ZoneDemand, Note · `dispatch_zones`: Header, Search, Chips, ZoneDemand |
| `active_offer` | Review offers and verify active stops | `dispatch_offer`, `dispatch_handoff` | `dispatch_offer`: Header, DriverStatus, OfferCard · `dispatch_handoff`: Header[back], Route, StopHandoff, Note |
| `dash_earnings` | Review shift pay, tips, and instant cashouts | `dispatch_payouts` | `dispatch_payouts`: Header, Amount[large], PayoutBreakdown, Bars |

Defaults: `dash_home/dispatch_online`, `active_offer/dispatch_offer`, `dash_earnings/dispatch_payouts`.
Layout ids are `dispatch_`-prefixed and unique across the catalog. Recipes use only core plus `dispatch` and
stay within weight 12.

## Worked example: RunnerDash

An independent courier and gig-driver app, separate from Ledge's plant care and Trot's dog walking. Opening
`dash_home/dispatch_online` shows `DriverStatus` set to `offline` in Midtown alongside `ZoneDemand`
highlighting a `very_busy` dinner surge (`+3` peak bonus). Tapping online requests location (`ok`) and
connects to dispatch; `active_offer/dispatch_offer` presents an `OfferCard` (`14.50` guaranteed, 3.2 mi,
22 min, 45s countdown). After accepting, `active_offer/dispatch_handoff` sequences pickup and dropoff on
`Route` and `StopHandoff` (two bag checks + photo proof via Core `Camera`). Finishing updates
`dash_earnings/dispatch_payouts`, where `PayoutBreakdown` computes total pay, tip share, and hourly rate.
Signature: core `route_draw` on the active handoff route.

## Tiers

`DriverStatus`, `StopHandoff`, and `ZoneDemand` need device location/camera permission (`ok`); live dispatch
connection, `OfferCard`, customer contact calls/messages, and instant cashout require a `service` tier
(`!needs-service`). `PayoutBreakdown` works offline over cached completed trip logs on the phone.

## Build notes

- Order: `DriverStatus`, `ZoneDemand`, `OfferCard`, `StopHandoff`, `PayoutBreakdown`; all remain planned.
- All drawings compose existing kit bases (`KitCard`, `KitRow`, `KitMeter`, `KitCheck`, `KitInput`, `KitTrack`,
  `KitChip`, `KitTime`, `KitTrail`, `KitAction`); no new wave-6 kit base is needed.
- Writers use strict `writerFormat(registry)` for core plus selected packs only; no aliases or off-pack ids.
  Amounts are numeric only and formatted with `moneyLine` under the brief's currency; never write computed
  totals, pay-per-mile, hourly rates, or countdown seconds remaining.
- One host dispatch store links completed `OfferCard`/`StopHandoff` records into `DriverStatus` and
  `PayoutBreakdown` totals.
- Every component is weight 2 and caps lists at 6 items; `OfferCard.decline` and `PayoutBreakdown.cashout`
  use shared `meta.confirmParts`.

## Open questions

- **New action names?** None. Accept, decline, call, message, photo, complete, dash, and cashout use `press`;
  online, pause, and schedule use `toggle`; mode uses `select`; items use `check`; PIN uses `type`.
- **1099 mileage logs and tax provisions?** Default: out of scope for `dispatch`; combine optionally with
  `books` or `auto/FuelLog` at the app level.
- **Navigation turn-by-turn HUD?** Default: use Core `Route` or combine optionally with `navigation`.

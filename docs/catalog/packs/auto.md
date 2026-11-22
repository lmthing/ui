# `auto` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Cars, EVs and driving: garage, remote vehicle controls,
odometer service logs, OBD diagnostics, fuel/EV logs, pumps, parking meters, car listings and VIN reports.
Not smart-home rooms (`home`), not venues (`places`).

## Purpose

Owning, maintaining, charging, parking, and shopping for cars and electric vehicles on one phone. Drivers
switch between vehicles in a garage, monitor connected state of charge and tire pressures, log dual-interval
maintenance and fill-ups, inspect OBD-II codes and recalls, authorize fuel pumps or parking meters, and
evaluate used-car listings alongside VIN provenance reports. Connected vehicle commands, forecourt pumps,
parking zones, and VIN lookups depend on outside services; remote commands never act without explicit
user confirmation and acknowledged telemetry.

## Apps it serves

Connected OEM companion apps (Toyota, Subaru, EV telematics), vehicle maintenance and fuel economy trackers
(CARFAX Car Care, Fuelio), OBD-II fault scanners (FIXD), fuel/EV charging networks (Shell, GasBuddy,
PlugShare), mobile parking meters (ParkMobile, SpotHero), and car-buying marketplaces (CarGurus,
Autotrader, Cars.com, Carvana).

## What the core already covers

- Driving safety scores or eco-driving targets: `Progress[ring]` paired with `Stats`; daily driving streaks: `Streak`.
- One vehicle's static registration or spec sheet: `Profile` with `KeyValue`; vehicle photos or damage
  shots: `Gallery` and `Camera`.
- Car marketplace search filtering: `FilterBar` with `Search` and `Chips`; dealer or shop reviews: `Review`;
  saved insurance cards or parking passes: `PassCard`; stored PDFs or inspection sheets: `FileList`.
- Pre-trip or roadside emergency packing: `Checklist`; registration renewal dates: `Calendar` or `Timer[until]`.

`Garage` adds multi-vehicle switching with masked VINs, powertrains, and derived maintenance/recall alerts,
not generic profiles (`Profile`) or household stock (`inventory` `Things`). `VehicleControl` handles vehicle
telematics and remote lock/climate/charge commands, separate from smart-home rooms (`home` `Devices`).
`ServiceLog` tracks dual mileage-and-calendar intervals rather than date-only pet/home care (`home`
`CareSchedule`); `Diagnostics` surfaces OBD-II fault codes and recalls; `FuelLog` computes MPG and mi/kWh
efficiency across odometer spans. Auto loans belong in `money` (`Loan`, `Payoff`), insurance/registration
vaults in `paperwork` (`Documents`, `Renewals`), and venue hours/addresses in `places` (`PlaceCard`,
`Address`); those packs are optional combinations, never dependencies.

## Components (9)

### `Garage` · planned · content · phone
Multi-vehicle garage switcher showing each vehicle's photo, year, make, model, trim, licence plate, masked
VIN, current odometer with unit, powertrain badge (`gas`, `hybrid`, `phev`, `ev`), and code-derived recall
or service-due alert pills. Selecting a card sets the active vehicle across garage screens; opening a vehicle
navigates to its detailed service or telemetry view.
- Pick: storing and switching between the driver's owned vehicles with odometer, powertrain, and masked VIN.
  Not one generic identity (`Profile`), household belongings (`inventory` `Things`), or a car for sale
  (`VehicleListing`).
- Writes: `vehicles` of `vehicleRef` text(32), `year` int 1900–2100, `make` text(20), `model` text(24),
  `trim` text(24) optional, `photo` optional, `plate` text(12) optional, `vin` secret(17) optional,
  `odometer` int ≥ 0, `unit` (`mi`, `km`), `powertrain` (`gas`, `hybrid`, `phev`, `ev`), `goto` optional,
  1–6; `activeRef` text(32) optional; `style`. Formatted odometer, VIN masking as `(secret)`, and due-service
  or open-recall pill counts come from host-linked `ServiceLog` and `Diagnostics` records, never model props.
- Styles: `switcher` (default, sideways vehicle card strip with active selection highlight), `list` (vertical
  rows showing all garage vehicles with alert badges).
- Parts → actions: vehicles `root select` (switches active vehicle), vehicles `open press` (goes to `goto`),
  `add press` (opens vehicle form).
- States: filled, empty (no vehicles stored yet), loading.
- Real path: vehicle profiles stored locally on the device, masking VIN strings through `secret` and reading
  due badges from local service/recall records.

### `VehicleControl` · planned · input · service
Connected vehicle telemetry and remote command console displaying fuel tank or EV battery state-of-charge
percentage and range, an EV charge-limit slider, four-corner tire pressure readings versus targets, door and
lock state, and remote lock, climate, horn/flash, or charge buttons. Pending commands disable interactive
controls until the OEM telematics adapter confirms acknowledgement.
- Pick: monitoring live vehicle telemetry and issuing remote lock, climate, or charging commands. Not
  smart-home rooms and thermostats (`home` `Devices`), not static vehicle facts (`KeyValue`).
- Writes: `vehicleRef` text(32), `name` text(32), `powertrain` (`gas`, `hybrid`, `phev`, `ev`), `fuelPct`
  number 0–100 optional, `batteryPct` number 0–100 optional, `range` number ≥ 0, `rangeUnit` (`mi`, `km`),
  `chargeLimit` int 50–100 optional (EV/PHEV only), `charging` boolean optional, `locked` boolean,
  `climateOn` boolean, `targetTempC` number 15–28 optional, `tires` of `corner` (`fl`, `fr`, `rl`, `rr`),
  `pressure` number ≥ 0, `target` number > 0, `pressureUnit` (`psi`, `kpa`), exactly 4 optional,
  `updatedAt` ISO datetime with offset; `style`. Low-tire warnings, stale telemetry flags, and unit display
  conversions are computed by code.
- Styles: `console` (default, vehicle state summary, primary remote toggles, and 4-corner tire card),
  `vitals` (focused telemetry panel highlighting tire pressures and EV charge-limit slider).
- Parts → actions: `lock toggle`, `climate toggle`, `charge toggle` (EV/PHEV only), `chargeLimit set` (5%
  steps), `temp increment`, `temp decrement` (0.5 °C steps), `horn press`, `refresh press`.
  `meta.confirmParts: ["lock", "climate", "horn"]`; all remote telemetry and command parts inherit `service`.
- States: filled, empty (vehicle not telematics-enrolled), loading (syncing or awaiting command ack),
  success (command acknowledged), error (vehicle unreachable or command timed out).
- Real path: a host telematics adapter relays authenticated commands to the OEM connected-vehicle service and
  returns confirmed vehicle state; without it, the screen is a labelled mock.

### `ServiceLog` · planned · input · phone
Vehicle maintenance schedule and service history tracking dual intervals—both odometer distance (`mi`/`km`)
AND calendar months—deriving due-soon or overdue state from whichever threshold arrives first. Tapping an
entry opens its past receipts and notes, while logging completion records service date, odometer, cost, shop,
and an optional receipt photo.
- Pick: mileage-and-date dual-interval vehicle maintenance tracking and service receipts. Not date-only
  household or pet care (`home` `CareSchedule`), not technician repair tickets (`requests` `WorkOrder`).
- Writes: `vehicleRef` text(32), `odometer` int ≥ 0, `unit` (`mi`, `km`), `items` of `serviceRef` text(32),
  `title` text(32), `everyDistance` int > 0 optional, `everyMonths` int 1–120 optional (at least one interval
  required), `lastDate` date optional, `lastOdometer` int ≥ 0 optional, `goto` optional, 1–12; `history` of
  `logRef` and `serviceRef` text(32), `date`, `odometer` int ≥ 0, `cost` number ≥ 0 optional, `shop` text(24)
  optional, `receipt` photo optional, 0–12; `style`. Remaining distance, remaining months, due-soon/overdue
  tones, and total maintenance spend are computed by code.
- Styles: `upcoming` (default, maintenance intervals sorted by earliest arriving distance or date threshold),
  `history` (chronological completed service records with shop, cost, and receipt thumbnail).
- Parts → actions: items `root press`, items `done press` (logs completed service), `add press`.
- States: filled, empty, loading, success (service logged), error (odometer earlier than previous service).
- Real path: maintenance schedules and receipts stored on the device; reminders before due dates or mileages
  need notification permission (`ok`).
- Density: `meta.dense: true`, weight 3; dual-interval schedules and completed service logs hold up to 12
  items each.

### `Diagnostics` · planned · data · phone
OBD-II diagnostic trouble code (DTC) and safety recall inspector showing active fault codes with vehicle
system tag, severity badge (`info`, `warn`, `critical`), plain-English cause, driveability warning, and
estimated repair cost band, paired with open NHTSA/OEM safety recalls and remedy availability. Users scan
connected adapters (`ok`), refresh recall bulletins (`service`), or send a confirmed clear-DTC command.
- Pick: inspecting OBD-II vehicle fault codes, severity, repair bands, and safety recalls. Not routine
  maintenance schedules (`ServiceLog`), not body symptoms (`health` `SymptomLog`).
- Writes: `vehicleRef` text(32), `scannedAt` ISO datetime with offset optional, `codes` of `code` text(8),
  `system` (`engine`, `transmission`, `abs`, `airbag`, `battery`, `emissions`), `severity` (`info`, `warn`,
  `critical`), `summary` text(48), `driveability` text(60), `costLow` number ≥ 0 optional, `costHigh` number
  ≥ 0 optional (`costLow ≤ costHigh`), 0–8; `recalls` of `campaignRef` text(24), `title` text(40), `issued`
  date, `remedyAvailable` boolean, `completed` boolean, 0–6; `style`. Overall driveability alert banner and
  cost band formatting (`moneyLine`) are computed by code.
- Styles: `faults` (default, active OBD-II codes with severity and repair cost range), `recalls` (open
  manufacturer recalls with campaign dates and remedy status).
- Parts → actions: `scan press`, codes `root press`, `clear press`, `refresh press`.
  `meta.partTiers: { scan: "ok", refresh: "service" }`; `meta.confirmParts: ["clear"]`.
- States: filled, empty (no trouble codes or open recalls), loading (reading OBD-II port), success (DTCs
  cleared or clean scan), error (Bluetooth adapter unreachable or recall service offline).
- Real path: reads local OBD-II trouble codes over a paired Bluetooth LE dongle (`ok`) and checks recall
  campaigns through a recall data service (`service`); never replaces certified mechanic inspection.

### `FuelLog` · planned · data · phone
Fill-up and EV charging ledger plotting computed fuel economy (`MPG`, `L/100km`, or `mi/kWh`) on
`KitLinePlot`, alongside headline average economy, cost per distance, total energy/fuel spend, and recent
entries showing odometer, volume or kWh added, unit price, total cost, fuel grade or charging network, and
full-tank flag. Economy calculations span consecutive full-tank or metered charging intervals only.
- Pick: logging fuel fill-ups or EV charges and tracking computed efficiency and cost per mile. Not general
  spending (`money` `Transactions`), not generic short trends (`Sparkline`), not home meters (`property`
  `Meters`).
- Writes: `vehicleRef` text(32), `mode` (`fuel`, `ev`, `both`), `distanceUnit` (`mi`, `km`), `energyUnit`
  (`gal`, `l`, `kwh`), `entries` of `entryRef` text(32), `date`, `odometer` int ≥ 0, `qty` number > 0,
  `unitPrice` number ≥ 0, `gradeOrNetwork` text(20) optional, `full` boolean (default true), `goto` optional,
  1–24; `style`. Trip distance, computed MPG / L/100km / mi/kWh, total cost, cost per mile/km, and trend
  points are computed strictly by code.
- Styles: `trend` (default, efficiency plot, average stats, and recent logs), `log` (chronological ledger of
  all fill-ups and charging sessions).
- Parts → actions: entries `root press`, `add press`, `style select`.
- States: filled, empty, loading, success (fill-up saved), error (odometer lower than prior entry).
- Real path: fill-up and charge logs stored locally on the device using the brief's currency via `moneyLine`.
- Density: `meta.dense: true`, weight 3; up to 24 fill-up records plus plotted efficiency curve exceed six
  rows.

### `ChargePump` · planned · action · service
Nearby fuel and EV charging station selector listing per-grade or per-kWh pricing, connector badges
(`NACS`, `CCS`, `CHAdeMO`, `J1772`), kW power rating, and open stall counts, paired with a live active
pump or charging session panel showing dispensed volume/kWh, running cost, elapsed clock, and a confirmed
stop trigger. Switching to live session mode keeps pump/charger authorization explicit.
- Pick: selecting a fuel pump or EV charger stall and controlling an active fueling or charging session. Not
  static venue info (`places` `PlaceCard`), not vehicle-side charge-limit settings (`VehicleControl`).
- Writes: `kind` (`fuel`, `ev`), `stations` of `stationRef` text(32), `name` text(32), `brand` text(20),
  `address` text(36), `connectors` (`NACS`, `CCS`, `CHAdeMO`, `J1772`) each 0–4, `maxKw` int > 0 optional,
  `openStalls` int ≥ 0 optional, `totalStalls` int > 0 optional, `unitPrice` number ≥ 0, `unitLabel` (`gal`,
  `l`, `kwh`), `goto` optional, 1–6; `session` of `stationRef` text(32), `pumpOrStall` text(12), `status`
  (`authorizing`, `active`, `stopping`, `complete`), `dispensed` number ≥ 0, `elapsedSeconds` int ≥ 0
  optional; `style`. Distance (`ok`), stall availability tone, and running cost (`dispensed × unitPrice`) are
  computed by code.
- Styles: `stations` (default, nearby forecourts/chargers with live pricing and open stalls), `session`
  (active pump or EV session telemetry with running cost and stop control).
- Parts → actions: stations `root select`, `start press`, `stop press`, `navigate press`.
  `meta.partTiers: { stations: "ok", start: "service", stop: "service" }`; `meta.confirmParts: ["start",
  "stop"]`.
- States: filled, empty (no stations matching connector filter), loading (authorizing pump or charger),
  success (session completed with receipt total), error (stall offline or authorization failed).
- Real path: connects to a fuel/EV charging network service for pricing and pump authorization, ordering
  nearby stations with device location (`ok`).

### `ParkingMeter` · planned · action · service
Street or garage parking session controller with zone code, licence plate picker, duration stepper, code-
computed parking fee and expiry timestamp, an active countdown with a one-tap "+Extend" button, and an
optional scannable `KitCode` garage entry/exit pass. Zone rates, maximum stay limits, and expiring-soon
warnings come from the zone schedule, never model guesses.
- Pick: paying, timing, and extending an active street or garage parking spot. Not a generic countdown
  (`Timer`), not transit departure times (`places` `Departures`).
- Writes: `zone` text(12), `zoneName` text(32), `plates` text(12) each 1–4, `plateAt` index, `hourlyRate`
  number ≥ 0, `maxMinutes` int 15–1440, `selectedMinutes` int 15–1440, `passCode` text(40) optional,
  `activeUntil` ISO datetime with offset optional, `status` (`draft`, `active`, `expired`); `style`. Total
  fee, expiry clock, remaining minutes, and expiring-soon tone are computed by code.
- Styles: `meter` (default, zone/plate/duration setup or live countdown with extend action), `gate`
  (full-width `KitCode` barcode pass for gated lots and garages).
- Parts → actions: `plate select`, `duration increment`, `duration decrement`, `start press`, `extend press`,
  `stop press`. `meta.confirmParts: ["start", "stop"]`; `meta.partTiers: { zone: "ok", start: "service",
  extend: "service", stop: "service" }`.
- States: filled, empty (choose a zone or add a plate), loading (confirming payment), success (parking active
  or extended), error (zone restricted or maximum duration reached).
- Real path: integrates with a parking operator service and uses device location (`ok`) to verify nearby zone
  codes; expiry alerts require notification permission (`ok`).

### `VehicleListing` · planned · content · phone
Car-for-sale listing summary displaying asking price, Deal Rating badge against market value (`Great Deal`,
`Good Deal`, `Fair`, `High`), mileage, drivetrain, powertrain, MPG or EV range, clean-title and owner-count
pills, seller name, and save or contact actions. In `card` style it renders compact search tiles; in
`detail` style it pairs cleanly under `Gallery[carousel]`.
- Pick: evaluating a car for sale with market Deal Rating, mileage, and title badges. Not real estate homes
  (`realestate` `HomeListing`), not owned item rentals (`inventory` `Listing`), not retail merchandise
  (`commerce` `Product`).
- Writes: `listingRef` text(32), `year` int 1900–2100, `make` text(20), `model` text(24), `trim` text(24)
  optional, `photo` optional (omit under `Gallery`), `price` number > 0, `marketValue` number > 0 optional,
  `odometer` int ≥ 0, `unit` (`mi`, `km`), `drivetrain` (`fwd`, `rwd`, `awd`, `4wd`), `powertrain` (`gas`,
  `hybrid`, `phev`, `ev`), `efficiency` text(16) optional, `owners` int 1–20 optional, `cleanTitle` boolean,
  `seller` text(28), `sellerType` (`dealer`, `private`), `saved` boolean, `goto` optional; `style`. Market
  Deal Rating and price delta vs `marketValue` are computed by code.
- Styles: `detail` (default, full listing specs, deal rating badge, title pills, and contact/save controls),
  `card` (compact search-result summary).
- Parts → actions: `root press` (in `card` to open `goto`), `save toggle`, `contact press`, `vin press`.
  `meta.partTiers: { contact: "service" }`.
- States: filled, loading, error (listing sold or unavailable).
- Real path: vehicle listings stored locally or retrieved from a car marketplace feed; contacting dealers or
  private sellers requires an external messaging/lead service.

### `VinReport` · planned · data · service
Vehicle history and provenance report keyed by VIN or licence plate, summarizing owner count, accident and
damage flags, odometer consistency verification, title brands, open recalls, a chronological service and
registration event timeline, and a market valuation range plotted on `KitRangeBand`. Raw VIN strings remain
masked on read unless explicitly revealed by the user.
- Pick: inspecting a vehicle's VIN provenance, accident history, odometer check, and market valuation band.
  Not car-for-sale cards (`VehicleListing`), not live OBD-II engine diagnostics (`Diagnostics`).
- Writes: `vin` secret(17), `vehicleTitle` text(36), `owners` int 0–20, `accidents` int 0–20, `titleClean`
  boolean, `odometerConsistent` boolean, `openRecalls` int 0–20, `valLow` number > 0, `valHigh` number > 0
  (`valLow ≤ valHigh`), `askingPrice` number > 0 optional, `events` of `date`, `odometer` int ≥ 0 optional,
  `unit` (`mi`, `km`), `place` text(24), `kind` (`registration`, `service`, `inspection`, `title`, `damage`),
  `summary` text(48), 1–12; `style`. Overall provenance tone, valuation marker placement, and formatted range
  values (`moneyLine`) are computed by code.
- Styles: `report` (default, provenance summary checks, valuation band, and chronological events), `timeline`
  (expanded service, registration, and title event history).
- Parts → actions: `lookup press`, `vin toggle` (reveal masked VIN), events `root press`.
- States: filled, empty (enter a 17-character VIN to inspect), loading (fetching report), error (invalid VIN
  or report unavailable).
- Real path: queries a vehicle provenance registry (NMVTIS/CARFAX-style service) by VIN while masking the
  stored identifier with `secret`; valuations are market estimates, not formal appraisals.
- Density: `meta.dense: true`, weight 3; provenance reports combine check grids, valuation bands, and up to
  12 historical events.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `auto_garage` | Vehicles, service intervals, and fuel logs | `auto_garage_overview`, `auto_service_log`, `auto_fuel_log` | `auto_garage_overview`: Header, Garage, Stats, Actions · `auto_service_log`: Header[back], ServiceLog, Note, Button · `auto_fuel_log`: Header[back], FuelLog, Note, Button |
| `auto_control` | Connected vehicle controls and OBD diagnostics | `auto_remote_controls`, `auto_obd_diagnostics` | `auto_remote_controls`: Header, VehicleControl, Note · `auto_obd_diagnostics`: Header[back], Diagnostics, Note, Button |
| `auto_park_fuel` | Parking meters, stations, and pump/EV sessions | `auto_parking_meter`, `auto_station_finder`, `auto_charge_session` | `auto_parking_meter`: Header, ParkingMeter, Note · `auto_station_finder`: Header, Search, Chips, ChargePump[stations] · `auto_charge_session`: Header[back], ChargePump[session], KeyValue, Note |
| `auto_market` | Car search, listing details, and VIN reports | `auto_car_search`, `auto_car_detail`, `auto_vin_report` | `auto_car_search`: Header, FilterBar, List[cards] · `auto_car_detail`: Header[back], Gallery[carousel], VehicleListing, KeyValue, Note · `auto_vin_report`: Header[back], VinReport, Note |

The first listed layout is each archetype's `defaultLayout`; all layout ids carry the `auto_` prefix and are
unique across the catalog. Recipes use only Core (including `FilterBar`) plus `auto`, keep at most one dense
component per layout, and avoid competing primary actions.

## Worked example: VoltLog (driver & EV companion)

Maya manages two family cars in `auto_garage/auto_garage_overview`: a 2024 Ioniq 5 EV (14,200 mi) and a
2019 Subaru Outback (68,450 mi). `auto_service_log` tracks the Outback's 7,500-mile / 6-month oil and tire
rotation intervals, flagging tire rotation due in 250 miles even though two months remain. `auto_fuel_log`
plots the Ioniq 5's charging efficiency (`3.6 mi/kWh` average) and cost per mile across 12 DC fast and home
sessions. Before a winter drive, `auto_control/auto_remote_controls` checks tire PSI and preheats the cabin
after confirmation (`confirmParts`), while `auto_park_fuel/auto_parking_meter` starts a 90-minute street
meter with a "+30m" extension. Signature: `count_up` on the garage's mileage/efficiency summary `Stats`.

## Tiers

`Garage`, `ServiceLog`, `FuelLog`, and `VehicleListing` browsing run locally on the `phone`. `Diagnostics`
OBD-II scanning and nearby station/zone matching (`ChargePump.stations`, `ParkingMeter.zone`) require
Bluetooth or location permission (`ok`, `!needs-ok`). Remote vehicle commands (`VehicleControl`), live
charging/parking payments (`ChargePump.start/stop`, `ParkingMeter.start/extend/stop`), recall lookups, dealer
messaging, and `VinReport` queries require outside services (`service`, `!needs-service`).

## Build notes

- Order: `Garage`, `ServiceLog`, `FuelLog`, `VehicleListing`, `Diagnostics`, `ParkingMeter`, `ChargePump`,
  `VehicleControl`, `VinReport`.
- Strict `writerFormat(registry)` permits only Core plus selected packs. Host-issued refs (`vehicleRef`,
  `serviceRef`, `listingRef`, `stationRef`) are snake_case `text(32)`. VINs use core `secret` so reads print
  `(secret)` unless explicitly unlocked by user action.
- Dual-interval service status evaluates `remainingDistance = everyDistance - (odometer - lastOdometer)` and
  `remainingDays = addMonths(lastDate, everyMonths) - today`, taking the earlier due state (`overdue`,
  `due_soon`, `ok`). Reject odometer values lower than prior logs for the same vehicle.
- Fuel economy computes across full-tank (`full: true`) boundaries by summing partial intermediate fills until
  the next full tank; partial-only runs omit MPG rather than inventing noisy spikes.
- `VehicleControl`, `ChargePump`, and `ParkingMeter` keep pending action buttons disabled until the host
  service acknowledges state transitions; never report success optimistically on tap.
- Dense components (`ServiceLog`, `FuelLog`, `VinReport`) carry `meta.dense: true` and weight 3; all others
  weigh 2 and cap lists at 6 items with shared "and N more" overflow copy.
- Compose all views solely from existing kit bases (`KitCard`, `KitRow`, `KitGrid`, `KitStrip`, `KitPhoto`,
  `KitMeter`, `KitSlider`, `KitLinePlot`, `KitRangeBand`, `KitCode`, `KitChip`, `KitTime`, `KitTrail`,
  `KitAction`); no new kit base or signature is required.

## Open questions

- **OBD-II Bluetooth protocol adapters?** Default: the host BLE adapter parses standard SAE J1979 DTCs and
  passes structured fault codes to `Diagnostics`; raw ELM327 serial polling stays outside the kit.
- **Auto insurance and registration cards?** Default: store scannable insurance cards in Core `PassCard` and
  registration/title PDFs in `paperwork` (`Documents`, `Renewals`) via combination, never duplicating them in
  `auto`.
- **Turn-by-turn driving navigation?** Default: `auto` stops at station selection and parked-spot timers;
  active turn-by-turn routing belongs in the planned `navigation` pack or Core `Route`.

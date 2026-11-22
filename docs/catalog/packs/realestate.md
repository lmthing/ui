# `realestate` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Searching, comparing and financing homes to buy or rent:
price-pin map search, listing details, PITI mortgage calculators, saved alerts and tours. Not landlord
operations (`property`), not one lease (`inventory`).

## Purpose

Consumer home buying and apartment hunting: exploring MLS and rental inventory on price-pin maps, evaluating
property specs and HOA/tax carry costs, estimating monthly PITI affordability before making an offer,
comparing shortlisted homes side by side, reviewing valuation trends and tax history, managing saved search
alerts, and requesting tours with listing agents. Landlord unit rosters, rent ledgers, and move-in
inspections stay in `property`; single signed rental agreements stay in `inventory` (`Lease`).

## Apps it serves

Consumer home-buying and apartment-search marketplaces (Zillow, Homes.com, Realtor.com, Redfin, Rent.,
Apartments.com) and mortgage affordability calculators.

## What the core already covers

- Listing photo carousels: `Gallery[carousel]`; basic neighborhood facts or school ratings: `KeyValue[grid]`.
- Rich multi-facet search filters (price range, beds, baths, home type, HOA cap): `FilterBar` (Core) paired
  with `Field[range]`, `Search`, and `Chips`.
- Seller disclosures, inspection PDFs, and floorplans: `FileList` (Core); neighborhood or building reviews:
  `Review` (Core); down-payment savings goals: `Progress[ring]` + `Amount`.
- Originated debt repayment tracking: `money` (`Loan`, `Payoff`); landlord property management: `property`
  (`Units`, `RentRoll`, `Viewings`); single rental lease: `inventory` (`Lease`).

`PropertySearch` pairs `KitMapTile` price markers with synced listing cards rather than five static venue
pins (`MapPins`) or non-priced places (`places` `MapList`). `HomeListing` presents buyer/renter specs, HOA,
taxes, and computed monthly preview instead of owner belongings (`inventory` `Listing`) or landlord units
(`property` `Units`). `MortgageCalc` computes prospective PITI + HOA before borrowing, distinct from tracking
an existing debt (`money` `Loan`). `SavedSearches` manages alert cadences and match counts; `TourBooking`
schedules agent walkthroughs without landlord viewing outcomes (`property` `Viewings`); `HomeCompare` puts
candidate homes in a comparison matrix; `ValueHistory` adds AVM confidence bands and county tax records.

## Components (7)

### `PropertySearch` · planned · content · service
Price-pin map synced with swipeable or scrollable home listing cards displaying primary photo, asking price
or monthly rent, beds/baths/sqft, listing status badge (`For Sale`, `New`, `Open House`, `Pending`, `For
Rent`), and a save heart toggle. Selecting a map pin highlights its corresponding card, while a View toggle
switches between split map+cards and full list view.
- Pick: browsing homes to buy or rent on a price-pin map paired with synced listing cards. Not up to five
  static pins (`MapPins`), not general cafés/parks (`places` `MapList`), not one home's full page
  (`HomeListing`).
- Writes: `mode` (`buy`, `rent`), `listings` of `listingRef` text(32), `price` number > 0, `per` (`none`,
  `month`), `address` text(36), `beds` int 0–20, `baths` number 0–20, `sqft` int > 0, `status` (`for_sale`,
  `new`, `open_house`, `pending`, `for_rent`), `photo`, `x` number 0–1, `y` number 0–1, `saved` boolean,
  `goto`, 1–6 (plus host overflow `"N more"`); `selectedRef` text(32) optional; `style`. Formatted compact pin
  labels (`$485k`), pin clustering, and currency strings (`moneyLine`) are computed by code.
- Styles: `split` (default, price-pin `KitMapTile` above synced listing cards), `list` (full-height listing
  cards with save heart and status pill).
- Parts → actions: pins `root select`, cards `root press` (opens `goto`), cards `save toggle`, `view select`
  (split vs list), `locate press` (`meta.partTiers: { locate: "ok" }`).
- States: filled, empty (no homes match current filters), loading, error (search service unavailable).
- Real path: fetches filtered MLS or rental listings from a real-estate search service, using device GPS
  (`ok`) only when the user taps Locate Me.

### `HomeListing` · planned · content · phone
One home-for-sale or apartment-for-rent summary block showing asking price or monthly rent, code-computed
estimated monthly payment preview (for-sale homes), beds/baths/sqft/lot/year-built icon facts, monthly HOA
dues, annual property tax, listing status badge, days on market, and Save, Tour, Calculate, or Contact Agent
actions. Designed to sit directly beneath `Gallery[carousel]`.
- Pick: presenting one advertised home's key specs, price, HOA/tax summary, and buyer/renter actions. Not
  landlord portfolio units (`property` `Units`), not general item rentals (`inventory` `Listing`), not local
  venues (`places` `PlaceCard`).
- Writes: `listingRef` text(32), `mode` (`buy`, `rent`), `price` number > 0, `per` (`none`, `month`),
  `address` text(48), `beds` int 0–20, `baths` number 0–20, `sqft` int > 0, `lotSqft` int > 0 optional,
  `yearBuilt` int 1700–2100 optional, `hoaMonthly` number ≥ 0 optional, `taxAnnual` number ≥ 0 optional,
  `status` (`for_sale`, `new`, `open_house`, `pending`, `for_rent`, `sold`), `daysOnMarket` int 0–9999
  optional, `saved` boolean, `tourGoto` optional, `calcGoto` optional; `style`. Price per square foot (`price
  / sqft`) and estimated monthly cost preview are computed by code.
- Styles: `summary` (default, price, status badge, icon facts, HOA/tax breakdown, and action buttons),
  `compact` (condensed overview header for quick preview screens).
- Parts → actions: `save toggle`, `share press` (`meta.partTiers: { share: "service" }`), `tour press` (opens
  `tourGoto`), `calc press` (opens `calcGoto`), `contact press` (`meta.partTiers: { contact: "service" }`).
- States: filled, loading, error (listing removed or unavailable).
- Real path: renders cached or saved listing details on the device; contacting agents and sharing links hand
  off to an external brokerage/messaging service.

### `MortgageCalc` · planned · input · phone
Interactive home-buying affordability calculator accepting home price, down payment ($ or % toggle), annual
interest rate, loan term (`15`, `20`, `30` years), annual property taxes, homeowners insurance, and monthly
HOA dues, then computing and rendering a stacked PITI share bar (`KitShare`) and exact monthly breakdown of
Principal & Interest, Property Tax, Insurance, PMI (when down payment < 20%), and HOA. Adjusting any control
recomputes totals immediately in code.
- Pick: estimating true monthly PITI + HOA housing affordability before buying a home. Not tracking an
  originated debt (`money` `Loan`), not multi-debt payoff (`money` `Payoff`), not one static sum (`Amount`).
- Writes: `homePrice` number > 0, `downPct` number 0–95, `interestRate` number 0–25, `termYears` (`15`, `20`,
  `30`), `taxAnnual` number ≥ 0, `insuranceAnnual` number ≥ 0, `hoaMonthly` number ≥ 0, `pmiMonthly` number
  ≥ 0 optional; `style`. Financed principal, monthly Principal & Interest amortization, tax/insurance/PMI
  shares, stacked bar percentages, and total monthly PITI are computed strictly by code.
- Styles: `full` (default, stacked PITI share bar, total monthly payment, and all editable controls),
  `compact` (headline monthly PITI with price, down payment, and rate sliders).
- Parts → actions: `price set`, `down set`, `rate set`, `term select`, `tax set`, `insurance set`, `hoa set`,
  `downMode toggle` ($ vs %).
- States: filled, loading, error (invalid zero price or out-of-range rate).
- Real path: pure client-side amortization math formatted via `moneyLine` in the brief's currency; estimates
  are informational planning figures, never a formal Loan Estimate.

### `SavedSearches` · planned · input · service
Saved home-search alerts showing each query's label and active filter summary ("3+ bd · ≤ $650k · Austin"),
host-computed new-match badge, notification cadence selector (`instant`, `daily`, `weekly`, `off`), mute
toggle, and confirmed delete. Tapping a saved search opens the filtered map/results screen.
- Pick: managing saved real-estate search alerts with match counts and notification cadences. Not typing one
  search query (`Search`), not shopping wishlists (`inventory` `Wishlist`).
- Writes: `searches` of `searchRef` text(32), `name` text(28), `summary` text(48), `cadence` (`instant`,
  `daily`, `weekly`, `off`), `muted` boolean, `goto`, 1–6; `style`. New-match counts and last-checked times
  come from the host listing-alert service, never model-invented numbers.
- Styles: `alerts` (default, cards with new-match badge, cadence chips, and mute/delete controls), `compact`
  (rows with match badge and open chevron).
- Parts → actions: searches `root press` (opens `goto`), searches `cadence select`, searches `mute toggle`,
  searches `delete press`. `meta.confirmParts: ["delete"]`; `meta.partTiers: { cadence: "ok" }`.
- States: filled, empty (no saved alerts yet), loading, success (alert preferences saved), error (sync failed).
- Real path: syncs saved search filters with a listing-alert service and sends push alerts when notification
  permission (`ok`) is granted.

### `TourBooking` · planned · input · service
Home tour and open-house scheduler allowing buyers or renters to switch between private in-person, live
video, or open-house RSVP modes, choose an open date and time slot on `KitSlotGrid`, enter an optional agent
note and pre-approval flag, and submit a tour request. Confirmed bookings display tour pass details with
confirmed cancel controls.
- Pick: scheduling a private home tour or open-house RSVP with a listing agent. Not personal service bookings
  (`booking` `Appointment`), not landlord prospect logs (`property` `Viewings`).
- Writes: `listingRef` text(32), `address` text(40), `agentName` text(28), `tourMode` (`in_person`, `video`,
  `open_house`), `dates` of `date`, `slots` of `id` text(16), `label` text(12), `taken` boolean, 1–8, 1–5;
  `dateAt` index, `slotId` text(16) optional, `note` text(120) optional, `preApproved` boolean (default
  false), `status` (`draft`, `requested`, `confirmed`, `cancelled`); `style`. Available slots reflect live
  brokerage calendar availability.
- Styles: `request` (default, mode selector, date chips, `KitSlotGrid`, agent note, and Request Tour button),
  `confirmed` (booked tour summary with address, time, mode badge, and cancel button).
- Parts → actions: `mode select`, `date select`, slots `root select`, `note type`, `preApproved toggle`,
  `submit press`, `cancel press`. `meta.confirmParts: ["cancel"]`.
- States: filled, empty (no tour windows available), loading (submitting request), success (tour confirmed),
  error (slot taken or request failed).
- Real path: submits tour requests to a brokerage scheduling service and locks chosen windows against live
  agent availability.

### `HomeCompare` · planned · data · phone
Sticky-column comparison matrix (`KitTable`) placing 2 to 4 saved homes side by side across asking price,
computed $/sqft, bedrooms, bathrooms, interior square footage, lot size, monthly HOA, annual property tax,
estimated monthly PITI, commute minutes, and walk or school score. Tapping a home header opens its listing
page, and an optional Differences Only switch filters out identical attributes.
- Pick: comparing 2 to 4 candidate homes side by side across specs and costs. Not arbitrary back-office
  tables (`data` `Table`), not a single listing (`HomeListing`).
- Writes: `homes` of `listingRef` text(32), `label` text(24), `photo` optional, `price` number > 0, `sqft`
  int > 0, `beds` int 0–20, `baths` number 0–20, `hoaMonthly` number ≥ 0, `taxAnnual` number ≥ 0, `lotSqft`
  int > 0 optional, `walkScore` int 0–100 optional, `schoolScore` int 0–10 optional, `commuteMin` int 0–300
  optional, `goto`, 2–4; `diffOnly` boolean (default false); `style`. Price per square foot, estimated monthly
  payment, and best-value row markers are computed by code.
- Styles: `matrix` (default, sticky attribute column and scrollable home columns), `highlights` (focuses on
  differentiating rows and best-value markers).
- Parts → actions: homes `root press` (opens `goto`), homes `remove press` (`meta.confirmParts: ["remove"]`),
  `diffOnly toggle`.
- States: filled, empty (select at least 2 saved homes to compare), loading.
- Real path: compares locally saved or cached listing specs via `KitTable`; no external call required once
  shortlisted.
- Density: `meta.dense: true`, weight 3; comparing 2–4 homes across 10+ attributes forms a dense matrix.

### `ValueHistory` · planned · data · service
Property automated valuation trend (`KitLinePlot`) displaying current estimated value, confidence spread
(`low`–`high` via `KitRangeBand` and shaded plot range), multi-year appreciation delta, and dated county
public records for past sales and property-tax assessments. Horizon chips switch smoothly across `1Y`, `3Y`,
`5Y`, and `10Y` without conflating property estimates with stock charts.
- Pick: inspecting a home's automated valuation trend, confidence band, sales history, and property-tax
  assessments. Not stock charts (`money` `PriceChart`), not body measurements (`health` `Measurements`).
- Writes: `listingRef` text(32), `address` text(40), `range` (`1y`, `3y`, `5y`, `10y`), `points` of `date`,
  `value` number > 0, `low` number > 0, `high` number > 0 (`low ≤ value ≤ high`), 4–40; `sales` of `date`,
  `event` (`sold`, `listed`, `price_change`), `price` number > 0, 0–6; `assessments` of `year` int 1950–2050,
  `assessedValue` number > 0, `taxPaid` number ≥ 0, 0–6; `style`. Current estimate, confidence interval width,
  and appreciation percentage are computed by code.
- Styles: `valuation` (default, confidence-band plot above sales and tax summary), `records` (chronological
  public sale and property-tax history rows).
- Parts → actions: `range select`, points `root select`, `style select`.
- States: filled, empty (no valuation or public tax history), loading, error (property-data feed offline).
- Real path: pulls AVM time series and county assessor/deed records from a property-data API; estimates do
  not replace a licensed appraisal.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `home_explore` | Price-pin map search and side-by-side home comparison | `realestate_search`, `realestate_compare` | `realestate_search`: Header, FilterBar, PropertySearch · `realestate_compare`: Header[back], HomeCompare, Note |
| `home_detail` | Listing photos, specs, valuation history, and disclosures | `realestate_listing`, `realestate_history` | `realestate_listing`: Header[back], Gallery[carousel], HomeListing, KeyValue[grid], Note · `realestate_history`: Header[back], ValueHistory, FileList, Note |
| `home_affordability` | Interactive PITI mortgage calculator and rate context | `realestate_calculator`, `realestate_rates` | `realestate_calculator`: Header, MortgageCalc, Note · `realestate_rates`: Header[back], Stats, Note, Button |
| `tours_alerts` | Saved homes, search alerts, and tour booking | `realestate_alerts`, `realestate_tour`, `realestate_saved` | `realestate_alerts`: Header, Segmented, SavedSearches, Note · `realestate_tour`: Header[back], TourBooking, Note · `realestate_saved`: Header, Segmented, List[cards], Button |

The first listed layout is each archetype's `defaultLayout`; all layout ids carry the `realestate_` prefix
and are unique across the catalog. Recipes use only Core (including `FilterBar` and `FileList`) plus
`realestate`, and keep at most one dense component per layout.

## Worked example: HearthFind (home search & financing)

Elena searches for a 3-bedroom house in Austin using `home_explore/realestate_search`: `FilterBar` sets
`≤ $650k · 3+ bd · 2+ ba`, and `PropertySearch` syncs map price pins with three matching homes. She saves
two favorites and opens `realestate_compare` (`HomeCompare`) to compare `$595k` vs `$630k` across `$318/sqft`
vs `$304/sqft`, HOA fees, taxes, and walk scores. Opening the Oak Ridge listing in `home_detail/realestate_listing`
shows photos in `Gallery[carousel]` above `HomeListing`, while `realestate_history` displays its 5-year
`ValueHistory` appreciation curve alongside disclosure PDFs in Core `FileList`. In
`home_affordability/realestate_calculator`, `MortgageCalc` computes `$3,618/mo` PITI+HOA at 20% down and
6.4% APR, and `tours_alerts/realestate_tour` reserves a Saturday 11:00 AM private walkthrough (`TourBooking`).
Signature: `count_up` on estimated monthly payment or valuation metrics.

## Tiers

`HomeListing`, `MortgageCalc`, and `HomeCompare` run locally on cached/saved data (`phone`).
`PropertySearch`, `SavedSearches`, `TourBooking`, and `ValueHistory` rely on brokerage, MLS, or public
record services (`service`, `!needs-service`). Map GPS centering (`PropertySearch.locate`) and saved-search
push alerts (`SavedSearches.cadence`) request device permissions (`ok`, `!needs-ok`).

## Build notes

- Order: `HomeListing`, `MortgageCalc`, `PropertySearch`, `SavedSearches`, `TourBooking`, `HomeCompare`,
  `ValueHistory`.
- Strict `writerFormat(registry)` permits only Core plus selected packs. Host refs (`listingRef`, `searchRef`)
  are snake_case `text(32)`. Never emit model-written currency symbols; format all money via `moneyLine` and
  the brief's currency.
- `MortgageCalc` uses standard monthly amortization `M = P * r * (1+r)^n / ((1+r)^n - 1)` (handling `rate = 0`
  as `P / n`) and computes monthly tax (`taxAnnual / 12`), insurance (`insuranceAnnual / 12`), PMI (when
  `downPct < 20`), and total monthly housing cost in code.
- `HomeCompare` carries `meta.dense: true` and weight 3; `PropertySearch` keeps up to 6 visible synced cards
  with host "and N more" overflow copy.
- Compose all views solely from existing kit bases (`KitCard`, `KitMapTile`, `KitTable`, `KitLinePlot`,
  `KitRangeBand`, `KitSlotGrid`, `KitShare`, `KitStrip`, `KitPhoto`, `KitContent`, `KitGrid`, `KitRow`,
  `KitSlider`, `KitInput`, `KitTrack`, `KitChip`, `KitIcon`, `KitText`, `KitTrail`, `KitAction`); no new kit
  base is required.

## Open questions

- **Boundary with `property` and `inventory`?** Resolved: `realestate` serves buyers and apartment hunters
  before moving in; landlord portfolios stay in `property`, and signed tenant leases stay in `inventory`.
- **Interactive polygon boundary drawing on search maps?** Default: freehand map polygon drawing stays in
  Core `Canvas`; `PropertySearch` filters by structured bounds/saved searches.
- **3D virtual tours / AR room staging?** Default: Matterport 3D walkthroughs and AR room restyling delegate
  to native/host `Canvas` views, keeping `HomeListing` declarative.

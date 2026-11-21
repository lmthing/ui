# `property` pack

**Status:** planned · **Wave:** to be decided · **Pick line:** Running rented property: units, occupancy,
rent, viewings, inspections, meters. Not owned things or one listing or lease (`inventory`), not repairs
and maintenance requests (`requests`).

## Purpose

The operating view of rented homes: which independently lettable units are occupied, who owes rent for
which period, who is viewing, what condition each room was in, and how meters changed. A landlord or host
can keep these records on one phone; tenant accounts, automatic payments and booking-platform sync are
not implied. This pack does not replace inventory's `Lease` or `Listing`.

## Apps it serves

A landlord with a few flats, a holiday-let host keeping agreed stays, student housing with independently
let rooms, a small letting agent managing a portfolio for owners.

## What the core already covers

- A tenant directory: `List` with `Search`; one tenant: `Profile`, `KeyValue`, `Composer[entry]`.
  Drop `Tenants`: names, contact details and unit links do not need another component.
- One unit's address, rooms and amenities: `KeyValue`; photographs: `Gallery[carousel]`; a headline
  rent: `Amount`. Drop `UnitCard`: `Card` can feature one unit.
- Occupancy and collected-rent summaries: host-computed `Stats`, `Progress` or `Bars[share]`.
  Drop `Occupancy` and `RentStats`: a ratio or a few totals is already core.
- Viewing dates and the day's appointments: `Calendar`, `Timeline[hours]`; drop `ViewingAgenda`.
- Inspection notes or an ordinary checklist: `Composer[entry]`, `Checklist`; one photograph: `Photo`.
- Entering one meter value: `Field[number]`; its latest short trend: `Sparkline`; drop `MeterCard`.
- Editing records: core `form` with `Field`s and `Button`; save confirmation: core `success`.

`Units` stays for occupancy derived from dated, mutually exclusive lets, not a photo list. `RentRoll`
reconciles rent charges and allocated receipts across units, not a badge or one payment. `Viewings`
links prospects to units and tracks attendance outcomes, not merely times. `Inspections` binds room
conditions to dated evidence and a locked report; `Meters` validates cumulative readings and computes
consumption by meter. Core options do not express those record relationships.
One agreement and an advertised property remain inventory `Lease` and `Listing`; maintenance belongs to
`requests`, even when an inspection finds damage. Clients, invoices and general payment tracking remain
`customers`; personal bills and bank transactions remain `money`. None is a dependency.

## Components (7)

### `Units` · planned · data · phone

Independently lettable flats, homes or rooms as rows with their current occupant, agreed rent and an
occupied, reserved or vacant badge. Picking a date recomputes the snapshot; opening a unit shows details.

- Pick: occupancy and rent across rented units from dated lets. Not owned stock (inventory `Things`),
  an advertised place (inventory `Listing`), one agreement (inventory `Lease`), or a plain list (`List`).
- Writes: `units` of `unitRef` text(32), `title` text(32), `address` text(36) optional, `photo` optional,
  `askingRent` number ≥ 0 optional with `askingPer` (`night`, `week`, `month`), `goto` optional, 1–12;
  `lets` of `letRef` and `unitRef` text(32), `occupant` text(24), `kind` (`tenancy`, `stay`), `start` date,
  `end` date optional, `rent` number ≥ 0, `per` (`night`, `week`, `month`), `cancelled` boolean
  (default false), 0–48; `on` date; `style`. No written occupancy, counts or current-rent totals.
- Styles: `register` (default), `cards` (photo and the same computed facts).
- Parts → actions: units `root press` (linked only), `date set` (date).
- States: filled, empty, loading, error (invalid or conflicting let dates).
- Real path: units and agreed tenancy/stay records on the device; no booking engine or lease editor.
- Metadata: `meta.dense: true`, weight 3; a portfolio register may exceed six units.

### `RentRoll` · planned · data · phone

One month's rent ledger by unit and occupant: assessed, received, outstanding and older arrears, with
totals. Recording a receipt allows part payments; voiding one keeps the audit record and reverses it.

- Pick: reconciling rent across units and periods. Not one client's payment (customers `PaymentStatus`),
  an invoice (customers `Invoice`), personal bills (money `Bills`), or one sum (`Amount`).
- Writes: `month` YYYY-MM, `charges` of `chargeRef`, `letRef` and `unitRef` text(32), `unit` text(32),
  `occupant` text(24), `due` date, `amount` number > 0, 1–24; `receipts` of `receiptRef` and `chargeRef`
  text(32), `date`, `amount` number > 0, `method` (`cash`, `transfer`, `card`), `voided` boolean
  (default false), 0–48; `style`. Charges are booked obligations, not model-written computed totals.
  Paid, outstanding, credit, arrears, overdue status and all summaries are code-owned.
- Styles: `ledger` (default), `outstanding` (only units with unpaid charges, same reconciliation).
- Parts → actions: charges `record press` (opens a core receipt form), charges `remind press`,
  receipts `void press`. `meta.partTiers: { remind: "service" }`; `meta.confirmParts: ["void"]`.
- States: filled, empty, loading, success (receipt recorded), error (save or reminder failed).
- Real path: a local rent ledger; reminders use messaging. Logging a payment never moves money.
- Metadata: `meta.dense: true`, weight 3; charge and receipt lines form a reconciled document.

### `Viewings` · planned · content · phone

Arranged property viewings with the unit, prospect, date, duration and recorded confirmation or attendance
outcome. The agent can edit, confirm or cancel one and send an invitation separately.

- Pick: property-viewing records and prospect outcomes. Not a day's times (`Timeline[hours]`), choosing
  free slots (booking `Slots`), or a service already booked (booking `Appointment`).
- Writes: `viewings` of `viewingRef` and `unitRef` text(32), `unit` text(32), `prospect` text(24),
  `start` ISO datetime with offset, `minutes` 5–180, `status` (`proposed`, `confirmed`, `attended`,
  `no_show`, `cancelled`), `note` text(36) optional, `goto` (edit form), 1–6; `style`.
  End times, order and past-date notices are computed; elapsed time never implies attendance.
- Styles: `rows` (default), `cards` (the same appointments with more detail).
- Parts → actions: items `edit press`, items `confirm press`, items `cancel press`,
  items `outcome select` (`attended`, `no_show`), items `invite send`.
  `meta.partTiers: { invite: "service" }`; `meta.confirmParts: ["cancel"]`.
- States: filled, empty, loading, success (updated or invitation sent), error (save or send failed).
- Real path: agreed appointments on the agent's phone; invitations need messaging, not booking sync.

### `Inspections` · planned · input · phone

One dated move-in, move-out or periodic report, room by room: each inspected feature's condition, note
and photos. Finalising locks the evidence; a later inspection can compare it with the previous report.

- Pick: a structured condition report with room-linked evidence and sign-off. Not ordinary jobs
  (`Checklist`), photos alone (`Gallery`), or a repair to request and track (`requests`).
- Writes: `inspectionRef` and `unitRef` text(32), `unit` text(32), `date`, `kind` (`move_in`, `move_out`,
  `periodic`), `rooms` of `roomRef` text(32), `title` text(32), `checks` of `checkRef` text(32),
  `title` text(32), `condition` (`unrecorded`, `good`, `worn`, `damaged`, `not_applicable`),
  `note` text(100) optional, `photos` media refs 0–3, 1–6, 1–8; `previousRef` text(32) optional,
  `finalisedAt` ISO datetime with offset optional; `style`. Completion and condition changes are computed.
- Styles: `rooms` (default, one selected room), `report` (read-only summary and evidence).
- Parts → actions: rooms `root select`; checks `condition select`, `note type`, `photo press`,
  `removePhoto press`; `finalise press`. `meta.partTiers: { photo: "ok" }`;
  `meta.confirmParts: ["removePhoto", "finalise"]`. Finalised reports disable every edit.
- States: filled, empty, loading, success (finalised), error (save, media or incomplete report).
- Real path: reports and evidence stored locally; adding a photo needs camera/library permission.
  Finalising records the inspector's sign-off, not tenant consent or a legal signature.
- Metadata: `meta.dense: true`, weight 3; a condition document has multiple room/check sections.
- Signature: reuse core `check_burst` if this is the app's chosen moment; no new signature.

### `Meters` · planned · input · phone

The unit's utility meters with their latest cumulative reading, previous reading and computed usage.
Selecting a meter opens its dated history; adding a reading validates it against that meter's sequence.

- Pick: cumulative utility readings and consumption by meter. Not entering one value (`Field[number]`),
  a short trend (`Sparkline`), body measurements (health `Measurements`), or smart controls (home `Devices`).
- Writes: `unitRef` text(32), `meters` of `meterRef` text(32), `title` text(32),
  `utility` (`electricity`, `gas`, `water`), `unit` (`kWh`, `m3`, `litre`), 1–6;
  `readings` of `readingRef` and `meterRef` text(32), `at` ISO datetime with offset, `value` number ≥ 0,
  `photo` media ref optional, 0–24; `addGoto` (reading form); `style`.
  Latest, previous, interval consumption and elapsed time are computed, never separate props.
- Styles: `register` (default), `history` (one selected meter's readings and interval usage).
- Parts → actions: meters `root select`, `add press` (opens `addGoto`), readings `photo press`
  (existing evidence only). New photos use core capture, not a hidden camera action.
- States: filled, empty, loading, success (reading saved), error (invalid sequence or save failed).
- Real path: manually recorded meter series on the device; no smart-meter service or bill calculation.
- Metadata: `meta.dense: true`, weight 3; dated reading histories exceed six rows.

### `RentalApplication` · planned · input · phone
A prospective tenant screening dossier displaying the applicant and any co-applicants, target unit, requested move-in date, stated monthly income against unit rent with a code-computed income-to-rent ratio, and screening verification pills for credit, background, income, and references. The manager can waitlist, approve, or decline the application, confirming before approving or declining.
- Pick: screening and deciding on prospective tenants between a viewing and lease start. Not job recruiting (`hiring/Candidate`), scheduling viewings (`Viewings`), or active tenancy registers (`Units`).
- Writes: `applicationRef` text(32), `unitRef` text(32), `unit` text(32), `monthlyRent` number > 0, `applicants` of `name` text(24), `monthlyIncome` number ≥ 0, `goto` optional, 1–4; `moveIn` date, `checks` of `kind` (`credit`, `background`, `income`, `refs`), `status` (`pending`, `passed`, `flagged`, `missing`), `note` text(60) optional, 1–4; `decision` (`pending` default, `waitlisted`, `approved`, `declined`), `note` text(120) optional, `style`. Total household income and income-to-rent ratio are computed by code.
- Styles: `dossier` (default, applicant summary, computed ratio, screening pills, and decision actions), `compact` (summary row with ratio and check status pills).
- Parts → actions: checks `root press` (when linked via `goto`), `waitlist press`, `approve press`, `decline press`, `note type`. `meta.confirmParts: ["approve", "decline"]`.
- States: filled, empty (no application loaded), loading, success (decision saved), error (screening verification failed).
- Real path: screening records and decisions stored on the manager's device; pulling external screening reports or notifying applicants uses `service` / `people` host adapters.

### `LeaseRenewal` · planned · input · people
A landlord-to-tenant lease renewal proposal comparing current monthly rent against the proposed rent with a code-computed percentage delta, selectable renewal term options such as 6-month, 12-month, or month-to-month, and a response deadline. The tenant can accept the renewal, type a counter-proposal note, or decline with confirmation.
- Pick: proposing, comparing, and responding to lease renewal terms for an occupied unit. Not generic policy expiry reminders (`paperwork/Renewals`), monthly rent ledgers (`RentRoll`), or static single-lease terms (`inventory/Lease`).
- Writes: `renewalRef` text(32), `unitRef` text(32), `unit` text(32), `tenant` text(24), `currentRent` number > 0, `proposedRent` number > 0, `options` of `label` text(16), `months` integer 0–36 (0 for month-to-month), `rent` number > 0 optional, 1–4; `selectedOption` index (default 0), `deadline` date, `status` (`sent` default, `accepted`, `countered`, `declined`), `counterNote` text(120) optional, `style`. Rent difference and percentage change are computed by code from `currentRent` and the chosen option.
- Styles: `offer` (default, current vs proposed rent, term cards, deadline, and tenant actions), `summary` (read-only accepted or declined outcome).
- Parts → actions: options `root select`, `accept press`, `counter press`, `decline press`, `note type`. `meta.confirmParts: ["accept", "decline"]`.
- States: filled, loading, success (renewal accepted or response recorded), error (deadline passed or send failed).
- Real path: renewal proposal shared between landlord and resident in a shared app (`people`); counter-offers record the tenant's preference without silently altering legal lease contracts.

## Archetypes (4)

| Archetype         | Job                                | Layouts                                                                 | Recipe                                                                                                                                                                                                       |
| ----------------- | ---------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `portfolio_units` | Units and arranged viewings        | `property_register`, `property_viewings`                                | `property_register`: Header, Search, Chips, Units, Stats · `property_viewings`: Header, Calendar[week], Viewings, Button                                                                                     |
| `unit`            | One unit's occupants and utilities | `property_unit_detail`, `property_unit_tenants`, `property_unit_meters` | `property_unit_detail`: Header[back], Gallery[carousel], KeyValue, Units (one unit) · `property_unit_tenants`: Header[back], List, Note, Button · `property_unit_meters`: Header[back], Meters, Note, Button |
| `rent_month`      | Reconcile rents for a month        | `property_rent_ledger`, `property_rent_receipt`                         | `property_rent_ledger`: Header, RentRoll, Note · `property_rent_receipt`: Header[back], Field[number], Field[date], Field[choice], Button                                                                    |
| `inspection`      | Record and read room conditions    | `property_inspection_rooms`, `property_inspection_report`               | `property_inspection_rooms`: Header[back], Inspections, Note · `property_inspection_report`: Header[back], Inspections[report], Note                                                                         |

The first listed layout is each `defaultLayout`; layout ids carry the property prefix and are unique.
Recipes use only core plus this pack, 3–5 components, weight at most 9 and at most two heavy components.
Core `form` adds a unit, let, viewing or meter reading; tenant rows open core `profile` or `detail`.

## Worked example: Three Flats

Ledge's plant care and Trot's walks do not run rented homes, so this example is a landlord's three flats.
On 18 November 2026, `portfolio_units/property_register` derives two occupied units and one vacant.
November charges are 900 and 1100; receipts of 900 and 600 give 2000 assessed, 1500 received and 500
outstanding. An older unpaid charge of 200 gives 700 total arrears, without counting it again as November
rent. Signature: `count_up` on the collected-rent summary, the app's only signature.
The vacant flat has a confirmed `Viewings` appointment; its prospect remains a contact, not a tenant.
`inspection/property_inspection_rooms` records the kitchen's worn worktop with a photo before finalising.
`unit/property_unit_meters` shows electricity readings 1200 and 1246, computing 46 kWh consumed.
A holiday host uses finite nightly stays instead; student rooms are separate units with their own lets.

## Tiers

All five main uses are `phone`: entered records do not require tenants or prospects to use the app.
Invitations and rent reminders read `!needs-service`; adding inspection evidence reads `!needs-ok`.
A tenant portal or shared staff editing needs a shared app (`people`) at the host/screen boundary.
No current part silently sends a tenant acceptance, takes payment or creates a maintenance request.

## Build notes

- Order: `Units`, `RentRoll`, `Viewings`, `Inspections`, `Meters`; Wave 6 additions follow in order: `RentalApplication`, `LeaseRenewal`.
  Future files include two domain examples and probes per component, kit-only renderers and an
  `example.jsonl` covering all components, validating and rendering in three presets.
- Wave 6 option upgrades on existing components: `RentRoll` adds `style: "tenant"` (signed-in resident's own charges, receipts, autopay badge, and `pay press` with `meta.partTiers: { pay: "service" }`); `Units` adds `style: "vacancies"` (surfaces vacant/notice-given units); `Inspections` adds optional tenant co-sign / dispute comment per check (`meta.partTiers: { sign: "people" }`).
- Wave 6 boundaries: consumer home-buying search and PITI mortgage calculators belong in `realestate`, repair work orders stay in `requests`, and community building notices compose from Core `Banner` + `List[expand]`.
- Strict `writerFormat(registry)` permits only core plus selected packs, with bounded schemas and no
  aliases. Host-issued refs are snake_case text(32), separate from validator item ids; references resolve
  and repeated seeds agree. Each component works without any sibling component mounted or another pack.
- Lets use half-open local dates `[start, end)`: checkout and a new arrival may share a date.
  `stay` requires `end` and nightly rent; `tenancy` permits no end and weekly/monthly rent. End follows
  start; cancelled lets are excluded; non-cancelled ranges cannot overlap within a unit. An active let
  means contractually occupied; otherwise a future let means reserved, otherwise vacant. Counts use all
  units at `on`; current rent comes from the active let, otherwise only an explicitly stored asking rent.
- Rent obligations are stored charges created by the host from agreed terms; date generation and any
  nightly/weekly amount multiplication are code, not Writer arithmetic. Receipt allocations are explicit
  per charge; one transfer split over charges uses distinct allocation refs. Sum non-voided receipts;
  outstanding is `max(0, amount - paid)`, credit `max(0, paid - amount)`, never netted between occupants.
  Month totals use charges due in that month; older arrears use earlier unpaid charges due before today.
  Current arrears include only unpaid charges due before today, not future charges or due-today amounts.
- Totals use full host records before filtering or slicing; seed bounds are not portfolio-size limits.
  Dense components declare `meta.dense` and weight 3; `Viewings` weighs 2 and shows at most six rows.
  Overflow uses shared "and N more" copy and host counts, never Writer totals; its pending runtime support
  is a build gate. Reads stay one line per unit, charge, viewing, room or reading; money uses `moneyLine`
  and the brief's currency, no currency props, raw styling or app content in component code.
- Viewing outcomes require the start to have passed; cancellation retains history and disables invite
  and outcome changes. Edits and confirmations apply only to active upcoming viewings. Sending never
  changes confirmation implicitly; a contact's name never implies an invitation was delivered.
- Finalising requires every check recorded or marked not applicable; evidence and notes remain immutable.
  Compare only matching room/check refs in a previous finalised report for the same unit, with an earlier
  date. Corrections create a new report, never overwrite evidence or imply deposit deductions or repairs.
- Meter timestamps are unique per meter, not future, and values nondecreasing in time; sort before
  differences. One reading has no consumption interval, not zero use. Replacement/reset starts a new
  meterRef, so usage never crosses series. No tariff, estimated bill or cross-utility sum.
- Reuse existing kit rows, cards, selectors, media and shared copy helpers; no new base or signature.
  Require state/part checks, date boundaries and conflicting lets, partial/voided receipts, earlier
  arrears, cancelled viewings, locked reports and out-of-order meter readings. Shared confirmation and
  permission dispatch must work before the relevant planned parts enter live prompts.

## Open questions

- **New action names?** None. Navigation, confirmation, record, void and finalise use `press`; choices
  use `select`, dates `set`, notes `type`, and invitations the existing `send`.
- **Lease, listing and maintenance ownership?** Keep `Lease` and `Listing` in `inventory`; maintenance
  belongs to the proposed `requests` pack. Inventory still plans `Request` and tenant routes; propose
  updating those boundaries in the index/owner task, not importing or duplicating that component here.
- **Proration, deposits and refunds?** Default: reconcile explicit agreed rent charges only; the host
  computes any proration under stored terms before booking a charge. Deposits, interest, automatic late
  fees, deductions, refunds and legal tenancy documents are outside this pack.
- **Holiday booking and student shared areas?** Default: record agreed stays, no marketplace or booking
  engine; only independently lettable rooms count as units. Shared-area inspections use a host area
  record, never double-count a building and its rooms as occupied units.
- **Wave and optional packs?** Wave to be decided. Index combinations may add `requests`, `customers` or
  `inventory`, but recipes never require them and the planned pack stays out of live prompts.

# `medical` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Patient care and clinical records: lab panels, Rx
refills, telehealth visits, insurance deductibles/EOBs, care summaries, triage and Rx prices. Not wellness
workouts/pills (`health`), not client billing (`customers`).

## Purpose

Clinical patient-portal workflows, pharmacy fulfillment, health plan coverage, and virtual clinic visits:
reviewing diagnostic lab panels with reference intervals, refilling or price-comparing prescriptions,
tracking in- and out-of-network deductibles and Explanations of Benefits (EOBs), inspecting allergies and
immunizations, completing pre-visit clinical triage or telehealth check-ins, and syncing connected therapy
monitors (CPAP/CGM). The pack never provides automated diagnosis or prescribes care; clinical records are
portal-synced or user-entered summaries with explicit medical disclaimers.

## Apps it serves

Hospital and clinic patient portals (MyChart, athenaPatient, healow), retail pharmacy and Rx savings apps
(CVS Health, Walgreens, GoodRx), health insurer member portals (UnitedHealthcare, Aetna Health), virtual
care and behavioral health apps (Teladoc Health, SimplePractice), and clinical therapy device dashboards
(myAir by ResMed, CGM compliance monitors).

## What the core already covers

- Messaging a care team or clinic: `Bubbles` paired with `Composer[reply]`; appointment reminders or visit
  dates: `Calendar` and `Timeline`.
- Scannable insurance member ID cards and pharmacy discount coupon barcodes: `PassCard` (Core); downloaded
  visit notes, imaging PDFs, or referral letters: `FileList` (Core).
- General clinic or pharmacy reviews: `Review` (Core); consent forms or simple intake checkboxes: `Checklist`,
  `Field`, and `Button` (or `customers` `Agreement` when loaded).
- Self-logged fitness workouts, daily pill check-offs, home vitals, and menstrual cycles: `health`
  (`Workout`, `Medication`, `Vitals`, `Cycle`); therapy journaling: `mind` (`Entries`); advance directives
  and medical tax receipts: `paperwork` (`Documents`, `Receipts`).

`LabPanel` renders multi-analyte clinical reports with lab reference intervals and clinician comments, distinct
from self-logged home readings (`health` `Vitals`). `Prescription` tracks pharmacy fulfillment stages and
refill requests, unlike daily dose ticks (`health` `Medication`). `InsuranceBenefits` tracks plan
deductibles and EOB adjudication rather than personal budgets (`money` `Transactions`) or client invoices
(`customers` `Invoice`). `TelehealthVisit` coordinates virtual clinic waiting rooms and After-Visit
Summaries, while `ClinicalIntake` runs scored provider-bound screenings (such as PHQ-9) rather than personal
wellness tags (`health` `SymptomLog`). Neighbouring packs are optional combinations, never dependencies.

## Components (8)

### `LabPanel` · planned · data · service
Clinical diagnostic test panel displaying panel title, collection date, ordering clinician, result status
(`final`, `preliminary`), and up to 16 analyte rows with measured value, unit, reference interval drawn on
`KitRangeBand`, high/low/normal flag tone, and an expandable clinician commentary note. Out-of-range markers
follow numeric lab bounds strictly and never emit automated diagnostic conclusions.
- Pick: presenting multi-analyte clinical lab or bloodwork panels with reference ranges and clinician notes.
  Not self-logged home vitals (`health` `Vitals`), not quiz scores (`learning` `Result`), not plain facts
  (`KeyValue`).
- Writes: `panelRef` text(32), `title` text(36), `collectedAt` date, `clinician` text(28), `status`
  (`final`, `preliminary`), `analytes` of `name` text(28), `value` number, `unit` text(12), `low` number,
  `high` number (`low ≤ high`), `note` text(80) optional, 1–16; `clinicianNote` text(240) optional; `style`.
  Low/normal/high classification, abnormal analyte count, and band marker position are computed by code.
- Styles: `panel` (default, analyte rows with `KitRangeBand` visual bars and clinician summary), `compact`
  (tight readout sorting out-of-range analytes first).
- Parts → actions: analytes `root press` (expands analyte note/history), `share press` (shares summary via
  host sheet, `meta.partTiers: { share: "service" }`).
- States: filled, empty (results pending release), loading, error (portal record unavailable).
- Real path: pulls clinical lab panels from an EHR/FHIR patient-portal service; reference flags reflect lab
  bounds only and require clinician review.
- Density: `meta.dense: true`, weight 3; comprehensive metabolic or CBC panels require up to 16 analytes.

### `Prescription` · planned · input · service
Pharmacy prescription list or single-Rx detail displaying drug name, strength, dosing directions (`sig`),
masked Rx number, prescriber, dispensing pharmacy, remaining refills, a four-step fulfillment track
(`ordered`, `filling`, `ready`, `picked_up`), estimated copay, and Request Refill or Transfer Pharmacy
buttons. Request Refill disables automatically when zero refills remain or a refill is already pending.
- Pick: tracking pharmacy prescription fulfillment status and requesting refills or transfers. Not daily
  personal dose check-offs (`health` `Medication`), not retail carts (`commerce` `Cart`).
- Writes: `items` of `rxRef` text(32), `drug` text(32), `strength` text(16), `sig` text(48), `rxNumber`
  secret(16), `prescriber` text(28), `pharmacy` text(28), `refillsLeft` int 0–99, `stage` (`ordered`,
  `filling`, `ready`, `picked_up`, `refill_requested`), `copay` number ≥ 0 optional, `expires` date optional,
  `goto` optional, 1–6; `style`. Refill eligibility, expired flag, and copay display (`moneyLine`) are computed
  by code.
- Styles: `list` (default, active prescriptions with status badge and refill button), `detail` (one Rx with
  4-step `KitStepsTrack` fulfillment bar and transfer action).
- Parts → actions: items `root press`, items `refill press`, items `transfer press`, items `coupon press`
  (opens linked `PassCard` / `RxCompare`). `meta.confirmParts: ["refill", "transfer"]`.
- States: filled, empty, loading, success (refill/transfer submitted), error (zero refills or pharmacy error).
- Real path: syncs Rx status and submits refill or transfer requests to a pharmacy/EHR service while masking
  Rx numbers via `secret`.

### `InsuranceBenefits` · planned · data · service
Health plan coverage summary displaying in-network and out-of-network Deductible and Out-of-Pocket Maximum
progress bars alongside Explanations of Benefits (EOB) claim rows showing service date, provider, service
description, billed amount, plan-covered amount, patient responsibility, and claim status (`processed`,
`pending`, `denied`). Opening a claim reveals itemized adjudication notes; tapping Member ID opens a
scannable `PassCard`.
- Pick: showing health insurance deductible/OOP accumulators and medical EOB claims. Not personal goal
  progress (`Progress`), not bank transactions (`money` `Transactions`), not client invoices (`customers`
  `Invoice`).
- Writes: `planName` text(36), `memberId` secret(20), `planYear` int 2020–2050, `accumulators` of `label`
  text(28), `network` (`in_network`, `out_of_network`), `met` number ≥ 0, `limit` number > 0, 1–4; `claims`
  of `claimRef` text(32), `date`, `provider` text(28), `service` text(32), `billed` number ≥ 0, `covered`
  number ≥ 0, `status` (`processed`, `pending`, `denied`), `goto` optional, 0–12; `style`. Remaining
  deductible/OOP (`max(0, limit - met)`), percentage met, and patient responsibility (`max(0, billed -
  covered)`) are computed by code.
- Styles: `overview` (default, accumulator meters above recent EOB claim rows), `claims` (full claim and EOB
  ledger).
- Parts → actions: claims `root press` (opens EOB detail), `card press` (opens linked `PassCard`), `style
  select`.
- States: filled, empty (no claims filed for plan year), loading, error (payer sync failed).
- Real path: retrieves plan accumulators and EOB claims from an insurance payer service while masking member
  identifiers via `secret`.
- Density: `meta.dense: true`, weight 3; network accumulator bars plus up to 12 EOB claims exceed six rows.

### `TelehealthVisit` · planned · action · service
Virtual clinic visit check-in and waiting room showing clinician name and credentials, visit reason,
scheduled time, pre-visit check-in items, microphone and camera readiness toggles (`ok`), live queue
position and estimated wait, a Join Visit trigger, and—once completed—the After-Visit Summary (AVS) care
instructions and follow-up links. Live A/V video frames run in the native host/Canvas player rather than
declarative JSON schemas.
- Pick: conducting virtual clinic check-in, A/V readiness, waiting queue, and After-Visit Summary review.
  Not salon/personal service bookings (`booking` `Appointment`), not general chat (`Bubbles`).
- Writes: `visitRef` text(32), `clinician` text(32), `specialty` text(24), `reason` text(48), `scheduledAt`
  ISO datetime with offset, `status` (`check_in`, `waiting`, `in_call`, `completed`, `cancelled`),
  `queuePosition` int ≥ 0 optional, `etaMinutes` int ≥ 0 optional, `micReady` boolean, `camReady` boolean,
  `checks` of `label` text(28), `done` boolean, 0–4; `avsSummary` text(300) optional, `followUpGoto` optional;
  `style`. Join button enablement derives strictly from completed check-in items, readiness, and room status.
- Styles: `waiting` (default, check-in tasks, mic/cam checks, queue ETA, and Join button), `avs` (post-visit
  clinician instructions and follow-up link).
- Parts → actions: checks `done check`, `mic toggle`, `cam toggle`, `join press`, `cancel press`, `followup
  press`. `meta.partTiers: { mic: "ok", cam: "ok" }`; `meta.confirmParts: ["cancel"]`.
- States: filled, loading (connecting to visit room), success (visit completed / AVS ready), error (device
  permission denied or connection failed).
- Real path: connects to a clinical telehealth queue service and validates local microphone/camera
  permissions (`ok`) before launching the host video session.

### `CareSummary` · planned · content · service
Longitudinal patient clinical record grouped into four structured sections: active Conditions, Allergies (with
reaction and severity badge `mild`, `moderate`, `severe`), Immunizations (doses recorded and next due date),
and Care Team contacts. An emergency view prioritizes severe allergies and active conditions at the top.
- Pick: viewing clinical conditions, allergies, immunization records, and care-team contacts. Not general
  life-admin PDFs (`paperwork` `Documents`), not plain non-clinical pairs (`KeyValue`).
- Writes: `conditions` of `name` text(32), `since` date optional, `status` (`active`, `resolved`), 0–8;
  `allergies` of `substance` text(28), `reaction` text(32), `severity` (`mild`, `moderate`, `severe`), 0–8;
  `immunizations` of `vaccine` text(28), `lastDate` date, `doses` int 1–10, `nextDue` date optional, 0–8;
  `careTeam` of `name` text(28), `role` text(24), `clinic` text(28) optional, `phone` text(20) optional, 0–4;
  `style`. Overdue vaccine flags and section counts are computed by code.
- Styles: `grouped` (default, four clinical sections with expandable entries), `allergies_first` (highlights
  severe allergies and active conditions first).
- Parts → actions: `section select`, items `root press`, careTeam `call press` (`meta.partTiers: { call:
  "service" }`), `export press` (`meta.partTiers: { export: "service" }`).
- States: filled, empty (no clinical records synced), loading, error (EHR sync failed).
- Real path: pulls patient clinical summaries from a SMART-on-FHIR / patient-portal service; records are
  read-only clinical facts, never generated medical advice.
- Density: `meta.dense: true`, weight 3; four clinical summary sections routinely exceed six total items.

### `ClinicalIntake` · planned · input · service
Pre-visit clinical symptom triage and standardized scored screening questionnaire (such as PHQ-9 or GAD-7)
capturing chief complaint, symptom onset date, red-flag warning checkboxes, scored single-choice scale
questions with code-computed total score, and an optional symptom photo (`ok`). Submitting transmits the
intake packet to the care provider only after explicit confirmation.
- Pick: collecting pre-visit clinical triage or standardized scored screenings for a provider. Not self-only
  daily wellness tags (`health` `SymptomLog`), not simple single-line inputs (`Field`).
- Writes: `formRef` text(32), `title` text(32), `chiefComplaint` text(80) optional, `onsetDate` date optional,
  `redFlags` of `label` text(36), `present` boolean, 0–6; `questions` of `prompt` text(80), `options`
  text(24) each 2–5, `scoreValues` int 0–10 each 2–5, `selectedAt` index optional, 1–12; `photo` optional;
  `style`. Computed total screening score, answered count, and emergency red-flag notice come strictly from
  code, never model-written diagnoses.
- Styles: `screening` (default, standardized multi-question scored instrument), `triage` (chief complaint,
  onset date, red-flag checks, and optional clinical photo).
- Parts → actions: `complaint type`, `onset set`, redFlags `present check`, questions `option select`, `photo
  press`, `submit press`. `meta.partTiers: { photo: "ok" }`; `meta.confirmParts: ["submit"]`.
- States: filled, empty, loading, success (intake sent to clinic), error (incomplete required items or red
  flag urging immediate emergency care).
- Real path: stores questionnaire state locally until confirmed submission to an EHR/triage service; red-flag
  prompts instruct seeking emergency care and never perform automated triage decisions.
- Density: `meta.dense: true`, weight 3; clinical screening instruments require up to 12 scored questions.

### `RxCompare` · planned · data · service
Medication price comparison across local pharmacies featuring dosage form and quantity selector chips,
pharmacy rows sorted by lowest price or shortest distance contrasting cash coupon price against estimated
insurance copay, and a Get Coupon button that opens a scannable `PassCard` discount coupon.
- Pick: comparing prescription cash-coupon and insurance prices across nearby pharmacies. Not retail SKUs
  (`commerce` `ProductGrid`), not general venue maps (`places` `MapList`).
- Writes: `drug` text(32), `forms` text(20) each 1–4, `formAt` index, `quantities` text(16) each 1–4, `qtyAt`
  index, `offers` of `offerRef` text(32), `pharmacy` text(28), `address` text(36), `couponPrice` number ≥ 0,
  `copayPrice` number ≥ 0 optional, `goto` optional, 1–6; `sort` (`price`, `distance`); `style`. Distance
  (`ok`), lowest-price badge, and `moneyLine` prices are computed by code.
- Styles: `list` (default, dosage/qty chips above sorted pharmacy rows), `compare` (side-by-side cash coupon
  vs insurance copay breakdown).
- Parts → actions: `form select`, `qty select`, `sort select`, offers `coupon press` (opens `goto` `PassCard`).
  `meta.partTiers: { offers: "ok" }`.
- States: filled, empty (no pharmacy quotes found), loading, error (pricing feed unavailable).
- Real path: queries a PBM / prescription discount pricing service and sorts distances using device location
  (`ok`).

### `TherapyMonitor` · planned · data · ok
Connected clinical therapy compliance dashboard (such as CPAP sleep therapy or continuous glucose monitor)
showing nightly 0–100 therapy score or Time-in-Range percentage on `KitRangeBand`, clinical index readouts
(AHI events/hr, mask leak, or hypo/hyper percentages), a multi-day trend line (`KitLinePlot`), and supply or
sensor replacement reminders. Syncing requires Bluetooth/health-store permission (`ok`).
- Pick: monitoring connected clinical therapy devices like CPAP or CGM compliance dashboards. Not general
  fitness goals (`health` `ActivityRings`), not smart-home plugs (`home` `Devices`).
- Writes: `deviceKind` (`cpap`, `cgm`), `deviceName` text(28), `periodLabel` text(20), `score` int 0–100
  optional, `inRangePct` number 0–100 optional, `targetLow` number, `targetHigh` number, `metrics` of `label`
  text(20), `value` number, `unit` text(10), 1–4; `trend` of `date`, `value` number, 4–30; `supplies` of
  `item` text(24), `daysLeft` int 0–365, 0–4; `syncedAt` ISO datetime with offset; `style`. Compliance goal
  status, replacement warnings, and trend plotting are computed by code.
- Styles: `summary` (default, score/Time-in-Range band, clinical indices, and trend plot), `supplies`
  (compliance overview paired with consumable replacement schedule).
- Parts → actions: `sync press`, supplies `reorder press` (`meta.partTiers: { reorder: "service" }`).
- States: filled, empty (no therapy sessions synced), loading (reading Bluetooth accessory), success (device
  synced), error (sensor disconnected or stale sync).
- Real path: syncs therapy telemetry from a paired BLE medical accessory or OS health store with user
  permission (`ok`); never modifies prescribed therapy settings.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `patient_portal` | Portal overview, lab panels, and clinical summary | `medical_home`, `medical_labs`, `medical_summary` | `medical_home`: Header, Banner, Actions, TherapyMonitor, List · `medical_labs`: Header[back], LabPanel, Note · `medical_summary`: Header[back], CareSummary, FileList, Note |
| `pharmacy_rx` | Active prescriptions and pharmacy price comparison | `medical_prescriptions`, `medical_rx_compare`, `medical_rx_coupon` | `medical_prescriptions`: Header, Search, Prescription, Button · `medical_rx_compare`: Header[back], RxCompare, Note · `medical_rx_coupon`: Header[back], PassCard, Note |
| `insurance_coverage` | Deductibles, EOB claims, and member ID card | `medical_benefits`, `medical_id_card` | `medical_benefits`: Header, InsuranceBenefits, Note · `medical_id_card`: Header[back], PassCard, KeyValue, Note |
| `virtual_care` | Pre-visit triage, waiting room, and clinic chat | `medical_intake`, `medical_waiting`, `medical_care_chat` | `medical_intake`: Header[back], Steps, ClinicalIntake, Note · `medical_waiting`: Header[back], Steps, TelehealthVisit, Note · `medical_care_chat`: Header[back], Bubbles, Composer[reply] |

The first listed layout is each archetype's `defaultLayout`; all layout ids carry the `medical_` prefix and
are unique across the catalog. Recipes use only Core (including `PassCard` and `FileList`) plus `medical`,
keep at most one dense component per layout, and separate clinician/portal summaries from automated advice.

## Worked example: CareLink (patient portal & Rx)

Jordan checks `patient_portal/medical_home` after a clinic visit, seeing a notification `Banner` for new
lab results and last night's `TherapyMonitor` CPAP summary (`Score 94 · AHI 1.2/hr · 7h 15m`). Tapping
Labs opens `medical_labs`, where `LabPanel` plots lipid and A1c analytes against reference bands alongside
the physician's comment. In `pharmacy_rx/medical_prescriptions`, Jordan sees Atorvastatin marked `ready`
for pickup and taps Compare Prices to open `medical_rx_compare` (`RxCompare`), selecting a $12 coupon that
opens in Core `PassCard` on `medical_rx_coupon`. `insurance_coverage/medical_benefits` tracks $1,420 met of
a $2,000 in-network deductible across four processed EOB claims, while `virtual_care/medical_waiting` checks
microphone/camera readiness (`ok`) before joining a follow-up visit. Signature: `count_up` on summary stats.

## Tiers

`TherapyMonitor` Bluetooth/health-store sync, `ClinicalIntake` photos, `TelehealthVisit` mic/camera checks,
and `RxCompare` distance sorting use device permissions (`ok`, `!needs-ok`). Portal records (`LabPanel`,
`Prescription`, `InsuranceBenefits`, `CareSummary`), `TelehealthVisit` sessions, `ClinicalIntake`
submission, supply reorders, and `RxCompare` live pricing require clinic/payer/pharmacy services (`service`,
`!needs-service`). Messaging the clinic through Core `Bubbles` + `Composer[reply]` carries `people`.

## Build notes

- Order: `Prescription`, `LabPanel`, `CareSummary`, `InsuranceBenefits`, `RxCompare`, `ClinicalIntake`,
  `TelehealthVisit`, `TherapyMonitor`.
- Strict `writerFormat(registry)` permits only Core plus selected packs. Host refs (`panelRef`, `rxRef`,
  `claimRef`, `visitRef`, `formRef`, `offerRef`) are snake_case `text(32)`. Member IDs and Rx numbers use
  `secret` so reads print `(secret)`.
- Never write automated diagnostic conclusions or medical advice in model-writable strings; `LabPanel` flags
  follow numeric `[low, high]` bounds strictly, and `ClinicalIntake` red-flag alerts display static
  emergency-care guidance from shared copy.
- `InsuranceBenefits` computes `remaining = max(0, limit - met)` and `patientResponsibility = max(0, billed -
  covered)` from stored adjudication amounts; never double-count pending or denied claims toward met totals.
- Dense components (`LabPanel`, `InsuranceBenefits`, `CareSummary`, `ClinicalIntake`) declare `meta.dense:
  true` and weight 3; all others weigh 2 and cap visible rows at 6 with shared "and N more" copy.
- Compose views solely from existing kit bases (`KitCard`, `KitRow`, `KitGrid`, `KitContent`, `KitRangeBand`,
  `KitLinePlot`, `KitStepsTrack`, `KitMeter`, `KitCheck`, `KitOption`, `KitInput`, `KitTrack`, `KitChip`,
  `KitPhoto`, `KitTrail`, `KitAction`); no new kit base or signature is needed.

## Open questions

- **SMART-on-FHIR and HL7 adapters?** Default: the host clinic/payer adapter translates FHIR R4 resources
  (`Observation`, `MedicationRequest`, `ExplanationOfBenefit`, `AllergyIntolerance`, `Immunization`) into
  these bounded schemas.
- **Native WebRTC telehealth video?** Default: `TelehealthVisit` handles pre-visit triage, A/V permission
  gating, queue ETA, and AVS review; live video rendering hands off to the native OS / `Canvas` media room.
- **Self-logged daily pill reminders?** Default: keep daily dose check-offs and home vitals in `health`
  (`Medication`, `Vitals`), loading `medical, health` together for chronic-care apps.

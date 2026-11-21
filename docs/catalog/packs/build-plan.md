# Pack build plan

How the planned packs become built, ready packs. The pack files say **what** each pack is; this file
says **how and in what order** they are built. Rules every pack follows: [README](README.md). Component
contract: [component guide](../../component-guide.md). Plan steps U5 and U7 of the
[implementation plan](../../implementation-plan.md) point here.

## How packs relate to the core

A pack screen is mostly core: across the pack archetypes, core ids appear about three times as often as
pack ids. Pack components fill only what the core cannot say ("core first"). Screens are flat, so a pack
component never contains a core component: it is drawn from the same kit bases, tokens and copy, and it
uses the same contract as a core component (meta, Zod props, fallback, examples, probes, view), the
same read/act runtime, the same probe gate and the same Writer format.

## Step 0: shared prerequisites (once, before wave 1)

| # | Work | Why |
| --- | --- | --- |
| P1 done | **Kit base survey.** Read every pack file, list each component's drawing needs, map them to existing bases, and write the backlog of new bases (for example a dice face, a wheel, a sign pad, a dense score grid, a Gantt bar row, a seating plan) with exact APIs and the waves that need them. The [base survey](bases.md) maps every pack component and lists the APIs and build order. | Component tasks stop when a base is missing (the core build showed this); bases are built ahead, to the visual rubric |
| P2 done | **Pack readiness gate.** A pack is ready and enters a registry, the pack index and `writerFormat` only when it has `pack.ts`, every component is `ready`, and `example.jsonl` validates; archetypes have no status; drafts still load with `includeDrafts` | Readiness is enforced at pack level, not component by component |
| P3 done | **Archetype checks.** Archetype ids unique across core and packs; layout ids unique within an archetype, addressed as `archetype/layout`; every layout exists; core archetypes use slots and per-layout defaults without `defaultLayout`; every recipe id exists in core or the same pack | Archetype and layout checks in `checkPacks` |
| P4 done | **`confirmParts` dispatch.** The runtime shows the standard confirm sheet for any part in `meta.confirmParts`, not only `Button.confirm`; a part with no `confirm` copy uses the shared neutral confirm label | Destructive pack parts (cancel, remove, decline) depend on it |
| P5 done | **Actions.** The vocabulary is `ActionName` plus `validateActionValue`, with runtime handlers; no pack needs a new action name, and `move` already exists | Read/act must cover every pack part |
| P6 | **End-to-end pipeline on one fixture pack.** `pack.ts`, generated entries, scoped `writerFormat`, pack choose/write/read probes with recordings under `pack/<id>`, compose probes for pack archetypes, `example.jsonl` validation, gallery overview grouped by pack with `?pack=<id>`, and `pnpm look` for pack components | Every wave reuses it; finding gaps once is cheaper than finding them in 27 packs |
| P7 | **Task generator.** A template per kind of task (pack scaffold, pack component, pack acceptance) and a script that writes them from a pack file, like the core component tasks | Keeps 27 packs consistent |

## Per-pack workflow

Each pack goes through four steps. Components inside one pack run in parallel.
A wave's base task budgets tests, `index.ts` doors and READMEs as files, and provides tokens and shared
copy for new drawing labels.

1. **Scaffold** (one Droid): `pack.ts`, components in `draft` with full meta and props, and archetypes
   as data without status. Director purpose, pick and near misses live in the shared index. An indexed
   pack can run Director probes with no ready components, even before its scaffold exists if selected
   explicitly. `checkPacks` counts shared Director probes together with any authored in `pack.ts`.
   This does not make drafts visible to live Director or Writer calls; those still require pack readiness.
2. **Components** (one Droid per component, as for the core): schema, examples, fallback, probes, view
   from kit bases, tests, `pnpm look` with no issues, `ui-reviewer` approval, `pnpm rules`. A component
   needing a missing base stops and names it; the base is built first.
3. **Archetypes and worked example** (one Droid): archetype layouts and per-layout defaults, compose probes
   (majority 2/3 on every layout), `example.jsonl` that validates line by line and renders in three
   presets.
4. **Acceptance** (orchestrator): pack probes pass on the required model (choose among core plus the
   pack, including its nearest core and nearest other-pack near misses), every component ready, the pack
   enters live registries when `pack.ts` exists and `example.jsonl` validates, recordings refreshed,
   merged and pushed.

Core recordings do not go stale when a pack is built: core probes use the core registry. Each pack has its
own recordings. The Director's pack-pick probes (which packs for an app idea) are re-recorded once per
wave, because each wave changes the pack index.

## Waves

| Wave | Packs | Why this order |
| --- | --- | --- |
| 0 | Step 0 prerequisites | Every wave depends on them |
| 1 | booking, customers | Trot, the Phase 1 worked example |
| 2 | health, kitchen, home, money, play | The most-asked personal apps; `play` turns the most common `Canvas` miss (games) into a showcase |
| 3 | commerce, mind, trips, learning, requests, property | Next most-asked; `requests` and `property` complete the landlord combination |
| 4 | social, media, events, places, community | Need `people` and `service` tiers; groups build on social and events |
| 5 | inventory, data, team, sports, projects, paperwork, books, invest, hiring | Business back-office and niche; order inside the wave follows real `Canvas` misses and forced fits |
| 6 | comms, assistant, workspace, utilities, security, auto, medical, weather, realestate, parenting, ticketing, dating, comics, watch, puzzles, navigation, stays, dining, news, reference, fantasy, studio, curation, safety, dispatch, marketplace, rpg, kids, beauty, perks | Full Google Play Store category coverage (32 app categories, 17 game categories, Kids, Wear OS) from the top-10 app audit |

A wave starts when the previous wave's packs are ready. Within a wave, at most six Droids run at once;
bases for the wave are built first, then scaffolds, then components, then archetypes and acceptance.

### Wave 6 prerequisites (before wave 6 scaffolds)

Before scaffolding any of the 30 Wave 6 packs in TypeScript, complete these shared runtime steps once so existing Wave 1–5 recorded Director probes remain valid until the Wave 6 re-recording pass:

1. **Pack index & ID registration:** Register the 30 Wave 6 pack IDs in `packages/ui/src/catalog/meta/pack-ids.ts` and split `pack-index.ts` (near the 200-line file limit) into focused modules under `packages/ui/src/catalog/meta/`.
2. **Pack folder scaffolds:** Add `packages/ui/src/packs/<pack>/README.md` scaffolds for all 30 Wave 6 packs (`scan-entries.ts` requires every folder under `src/packs/` to be registered in `packIds`).
3. **`copy` action vocabulary:** Add `copy` to `ActionName`, `validateActionValue`, and the browser/runtime action dispatcher.
4. **Core promotions & Wave 6 Core additions:** Build `PassCard` and `FileList`, promote `FilterBar` (from `data`), `Review` (from `customers`), and `Article` (from `media`) into Core, apply the 15 targeted Core option upgrades documented in [core.md](../core.md), and migrate `trips/Weather` standalone weather usage to `weather`.
5. **Director pack-pick re-recording:** Add the Wave 6 descriptions and shared probes to the Director
   index before component scaffolding. Re-record just the selection probes with `pnpm llm:check --director`
   against all 57 choices, then replay them with `pnpm llm:check --director --replay`.
6. **12 new shared kit bases:** Build `KitMicCapture`, `KitCodeBlock`, `KitVoiceOrb`, `KitCalcPad`, `KitDialGauge`, `KitMasonry`, `KitHoldButton`, `KitPanelStrip`, `KitRemotePad`, `KitSeatGrid`, `KitCellGrid`, and `KitLetterKeys` (plus minor `KitMapTile`, `KitLinePlot`, and `KitPhoto` option extensions) as mapped in [bases.md](bases.md).

### Wave 6 extensions to existing packs and core

In addition to the 30 new Wave 6 packs (196 components, 110 archetypes), Wave 6 adds **59 components** and targeted option upgrades to the 27 Waves 1–5 packs (growing 180 → 239 components; existing archetype counts stay unchanged at 109), plus `PassCard`, `FileList`, 3 Core promotions, and 15 Core options in [core.md](../core.md). New components added to an existing pack keep that pack's original wave in [bases.md](bases.md).

| Pack | Base wave | Wave 6 additions | New total |
| --- | --- | --- | --- |
| `booking` | 1 | `ClassRoster`, `SessionPack` (+ options on `Appointment`, `Slots`, `Availability`, `ServiceMenu`) | 8 |
| `customers` | 1 | `FollowUpQueue`, `SavedItems` (+ `Review` Core promotion prep & `Invoice`/`PaymentStatus`/`ClientCard` options) | 9 |
| `health` | 2 | `CardioSession`, `TrainingPlan` (+ `ActivityRings`, `Vitals`, `Workout`, `Cycle` options) | 11 |
| `kitchen` | 2 | `NutritionFacts` (+ `MealPlan`, `Pantry`, `Ingredients` options) | 8 |
| `home` | 2 | `CameraFeed`, `Routines` (+ `Devices`, `CareSchedule`, `Agenda` options) | 9 |
| `money` | 2 | `CardControls`, `MoneyTransfer`, `CreditScore` (+ `AccountCard`, `Bills`, `Split`, `Transactions`, `Loan` options) | 11 |
| `play` | 2 | `LifeCounter`, `PassReveal`, `CardDeck`, `BuzzerPad` (+ `Dice`, `ScoreSheet`, `Trivia`, `TurnOrder` options) | 10 |
| `commerce` | 3 | `SizeGuide`, `SavedList` (+ `OrderStatus`, `ProductGrid`, `VariantPicker`, `Product`, `Promo` options) | 11 |
| `mind` | 3 | `ThoughtRecord` (+ `SleepLog`, `Entries`, `Breathe`, `Soundscape` options) | 8 |
| `trips` | 3 | `FlightStatus`, `BagTracker`, `CabinSeats` (`Weather` stays intact; dedicated weather apps migrate to `weather`) | 10 |
| `learning` | 3 | `WorkedSolution`, `Gradebook`, `SpeechCheck` (+ `Quiz`, `Flashcard`, `Path` options) | 11 |
| `requests` | 3 | `SlaPolicy`, `CannedReplies` (+ `RequestThread`, `RequestQueue`, `WorkOrder` options) | 7 |
| `property` | 3 | `RentalApplication`, `LeaseRenewal` (+ `Units`, `RentRoll`, `Inspections` options) | 7 |
| `social` | 4 | `ActivityFeed`, `Groups`, `StoryViewer`, `FollowList`, `LiveRoom` (+ `Post`, `Feed`, `Stories`, `Invite` options) | 13 |
| `media` | 4 | `Transcript`, `AudioMatch` (+ `Article` Core promotion prep & `Library`, `Collection`, `Playlist` options) | 9 |
| `events` | 4 | `Sessions` (+ `Ticket`, `Door`, `Seating`, `GuestList` options) | 9 |
| `places` | 4 | `StationRates` (+ `PlaceCard`, `MapList`, `DeliveryTracker`, `Hours`, `Departures` options) | 7 |
| `community` | 4 | `ModQueue` (+ `Vote`, `Dues`, `Members`, `Minutes` options) | 6 |
| `inventory` | 5 | Options only (`Things` barcode/QR scan, condition, serial metadata; `Storage`, `Loans` options) | 8 |
| `data` | 5 | `Funnel`, `SavedViews` (+ `FilterBar` Core promotion prep & `Table`, `Board`, `LineChart`, `ActivityLog` options) | 9 |
| `team` | 5 | `LeaveBalance`, `PayStub`, `TeamDirectory`, `TeamNotice` (+ `Roster`, `Shift`, `TimeClock`, `Approval` options) | 11 |
| `sports` | 5 | `MatchStats`, `BoxScore`, `MomentumChart` (+ `Fixtures`, `Scoreboard`, `Lineup`, `Standings` options) | 10 |
| `projects` | 5 | `ProjectStatus`, `ProjectBrief` (+ `Tasks`, `Gantt`, `TimeLog` options) | 7 |
| `paperwork` | 5 | `ScanBatch`, `FormFiller` (+ `Documents`, `TaxYear`, `Signature` options) | 7 |
| `books` | 5 | `Reconcile`, `MileageLog`, `CashForecast` (+ `Ledger`, `Expenses`, `ProfitLoss` options) | 8 |
| `invest` | 5 | `TradeTicket`, `Rebalance` (+ `Holdings`, `Watchlist`, `Performance`, `Dividends` options) | 7 |
| `hiring` | 5 | `JobFeed`, `ResumeProfile` (+ `JobPost`, `ApplicantPipeline`, `Candidate`, `Interview`, `Offer` options) | 8 |

## Gates

- **Core first:** before a pack component is built, its task names the nearest core component and option
  and says what they cannot show; if they can, the component is dropped and the pack's recipes use the
  core one. Each pack component has a choose probe whose near miss is that core component, and the
  pack's probes include a core need that must still pick the core component with the pack loaded.
- **Component:** the core gates (model probes 2/3 on every probe, `pnpm look` no issues, reviewer
  approval, `pnpm rules`, tests).
- **Pack:** `pack.ts` exists; every component ready; archetype compose probes 2/3 on every layout;
  `example.jsonl` validates and renders in three presets; pack-level choose probes for near misses
  against the core and named other packs.
- **Wave:** Director pack-pick probes over the wave's app ideas (the combinations table) pass; prompt
  budgets hold for core plus any three packs (estimated tokens under the gate in the prompt folder).

## Risks

| Risk | Mitigation |
| --- | --- |
| Near misses across packs (`Poll`/`Vote`, `Board`/`Tasks`, `Lease`/`Units`) | Each pick names the other; pack probes include cross-pack near misses; the combinations table decides which pack an app loads |
| Prompt size with three large packs | Estimated-token gate per wave; drop or merge a component before raising a budget |
| Kit base growth | Bases grouped by layer folders (≤12 files each, `pnpm rules`); new layers for pack families when needed |
| Recording size (8 MB today) | One recording file per pack; review growth at each wave |
| New interactions (roll, spin, sign, drag) | P5 covers existing action names and value validation; runtime handlers precede the components that need them |

# Design gap matrix

A prioritization audit, not a second acceptance gate. Inventory: core definitions in [`src/components`](../../packages/ui/src/components) and built pack roots with `pack.ts` and registered entries in [`src/packs`](../../packages/ui/src/packs). `core.md` is intent; the definitions decide whether an entry is built. Scores reflect a source/fixture audit, not a sweep of live app, native or accessibility outcomes. Pack rows sample the named components and score how reliably **the pack** meets the criterion, not its best screen.

The scores are **A**natomy (task/identity and order), **S**tates (usable transitions and recovery), **V**ariants (supported, materially different choices), **M**otion (intentional supported response and fallback), **C**opy (specific, truthful, reader-aligned). `0` missing or mismatched; `1` baseline only (e.g. generic state, generic kit motion, or one layout); `2` substantively present with a named gap or missing evidence; `3` strong source/fixture evidence for the dimension, not certification of a platform. Motion `1` is not an instruction to animate an intentionally still component; document and test the cut. No entry receives `3` for motion without sequence acceptance.

Rank by impact, not score sum: **P0** misleading commitment, permission, blockers to completing a task; **P1** high-frequency work, unreadable records, recovery, or repeated tester evidence; **P2** distinctness or polish after tasks are usable. Within a tier, start with the first listed item. Tester names below refer to app-repo reports. Names are observations about patterns, not attribution to a specific renderer unless the code confirms it.

- **T1 (p5-user2-a, p5-user2-c):** queue names, statuses and facts are hard to scan; stable row slots, full facts and honest chevrons.
- **T2 (p5-user2-a, p5-user2-c):** handoff/budget/booking receipts lose record identity or confuse pending and accepted; persistent field labels/units; same job in both roles.
- **T3 (p5-user2-b, p5-user-b):** reservation first view may be empty; wait/receipt copy can disagree; kitchen/dispatch needs one visible unit of work. Missing journeys and incorrectly generated copy belong to the harness.
- **T4 (p5-user2-c, p5-user2-a, p5-user-c):** theater needs a poster-led hierarchy; stage clips role/receipt names, transport competes with a CTA, inspection appears interactive. Stage navigation or playback is an app finding, not a core component defect.

## Core (51 definitions)

| Impact | Component      |   A |   S |   V |   M |   C | Top fix / evidence to produce                                                                                                        |
| ------ | -------------- | --: | --: | --: | --: | --: | ------------------------------------------------------------------------------------------------------------------------------------ |
| P0     | HandoffReceipt |   3 |   2 |   2 |   1 |   3 | Verify pending, received and rejected examples with the same reference and a real receiver action, not a generic Next (T2).          |
| P0     | Success        |   2 |   1 |   2 |   1 |   2 | Show one durable, wrapping outcome/record with a next action; pair with pending and rejected frames without a success mark (T2, T4). |
| P0     | Field          |   2 |   1 |   2 |   1 |   2 | Keep label and unit visible while focused/filled, preserve errors and keyboard CTA placement; verify photo consent (T2).             |
| P0     | Button         |   3 |   1 |   2 |   2 |   3 | Compare enabled, pending and unavailable without layout shift; confirm an external commit once or provide retry on rejection.        |
| P0     | Sheet          |   2 |   2 |   2 |   1 |   2 | Replace a bare “Confirm” with a named action and record; verify dismiss, repeated Back and focus return during transition.           |
| P0     | Camera         |   2 |   1 |   1 |   1 |   2 | Cover denied/missing adapter, cancel, retake and review; do not fake a successful upload.                                            |
| P0     | SignInOptions  |   2 |   1 |   2 |   1 |   2 | Make service unavailable/cancel/return legible; separate a preview of OAuth from a real supported action.                            |
| P0     | FileList       |   3 |   3 |   2 |   1 |   2 | Pair download, error and missing frames; put the safe retry/available offline state by the file; verify host policy.                 |
| P0     | PassCard       |   3 |   3 |   2 |   1 |   3 | Sequence brightness opt-in, denied and restoration on dismissal; keep the code's identity in every state.                            |
| P0     | Composer       |   2 |   2 |   2 |   1 |   2 | Make pending, rejected and sent distinct and preserve draft/attachment; don't suggest receipt or reply on dispatch.                  |
| P1     | List           |   3 |   2 |   3 |   1 |   2 | Test long names/status and full facts in mixed read-only/actionable queue; scope empty and keep focus stable on peek return (T1).    |
| P1     | KeyValue       |   3 |   2 |   2 |   1 |   2 | Wrap a long task beside a stable record ID; put last update first and align comparable values (T1).                                  |
| P1     | Empty          |   2 |   2 |   2 |   1 |   2 | Add paired caught-up, no matches and restricted examples; no dummy CTA (T1).                                                         |
| P1     | Header         |   3 |   2 |   2 |   1 |   2 | Long role/scope wraps in one header; Back restores exact list position, without duplicate title in note (T4).                        |
| P1     | TabBar         |   3 |   2 |   2 |   1 |   3 | Verify stable selected label and focus between peers; no slide implying ordered steps.                                               |
| P1     | Search         |   2 |   1 |   1 |   1 |   2 | Keep query, clear and scope through waiting, failure and no results; reject stale replies.                                           |
| P1     | FilterBar      |   3 |   2 |   2 |   1 |   2 | Verify count and Clear match applied filters; last chip reachable by keyboard and latest results announced once.                     |
| P1     | Choice         |   3 |   2 |   2 |   1 |   3 | Keep selection, status and value legible for a long choice with no availability; show immediate selected feedback.                   |
| P1     | Checklist      |   3 |   2 |   2 |   2 |   2 | Show incremental completion and undo; trigger a burst only for an earned moment, not initial paint.                                  |
| P1     | Stats          |   2 |   2 |   2 |   2 |   2 | Include period, unit and comparable rollup breakdown; never start a safety-critical amount at zero (T1/T2).                          |
| P1     | Amount         |   2 |   2 |   2 |   1 |   2 | Test large negative amounts, exact reader and clear delta direction with text, not color alone.                                      |
| P1     | Progress       |   3 |   2 |   3 |   2 |   3 | Cover determinate zero vs unknown and failure; pair `ring_fill` with same final value reduced.                                       |
| P1     | Timeline       |   3 |   2 |   2 |   2 |   2 | Anchor current status and timestamp by record; show “No updates yet” separate from completed (T1).                                   |
| P1     | Calendar       |   3 |   1 |   2 |   2 |   2 | Distinguish available/full and range selection without color; selected date survives month switch and reduced sweep.                 |
| P1     | MapPins        |   2 |   2 |   2 |   1 |   2 | Pair graphical pins with keyboard/list access and a timestamped fallback when map data fails.                                        |
| P1     | Route          |   3 |   1 |   2 |   2 |   2 | Put live/stale state and next/last stop above the route; don't sweep stale GPS.                                                      |
| P1     | Actions        |   2 |   1 |   2 |   1 |   2 | Compare row/grid layouts with one dominant intent and explicit unavailable/destructive treatment.                                    |
| P1     | Bubbles        |   2 |   2 |   2 |   1 |   2 | Preserve conversation position; announce incoming vs failed once, show time/actor without relying on alignment.                      |
| P1     | Player         |   3 |   2 |   2 |   1 |   2 | Cover playing, buffering, unavailable and seek/retry; maintain focus and elapsed state at long titles.                               |
| P1     | Card           |   3 |   2 |   3 |   1 |   2 | Verify content hierarchy and long state badges with and without media; focus/return from detail stays tied to the record.            |
| P1     | Photo          |   3 |   3 |   2 |   1 |   2 | Keep caption and subject equivalent after load/error; verify fallback on the same reserved crop.                                     |
| P1     | Gallery        |   3 |   3 |   3 |   1 |   2 | Check last tile and return focus for grid/rail, reserve crops and keep missing imagery actionable only where supported.              |
| P1     | Hero           |   2 |   2 |   3 |   1 |   2 | Prioritize one object and one next action; wrap long subject and preserve actual title in a media fixture (T4).                      |
| P1     | Banner         |   2 |   1 |   2 |   1 |   2 | Verify stale/pending/error treatment doesn't steal focus or compete with a more important task.                                      |
| P1     | Steps          |   3 |   2 |   2 |   1 |   3 | Test ordered start/middle/end plus reversal without a moving CTA.                                                                    |
| P1     | People         |   3 |   2 |   2 |   1 |   2 | Show role/availability with a stable name; avoid display-only people looking like a navigable group.                                 |
| P1     | Chips          |   3 |   2 |   2 |   1 |   2 | Label selected/unavailable with more than tint; keep multi-select clear after long labels wrap.                                      |
| P1     | Segmented      |   3 |   2 |   1 |   1 |   2 | Test keyboard peer change and long labels; use a row alternative when segments cannot fit.                                           |
| P1     | SwipeStack     |   3 |   2 |   2 |   2 |   2 | Verify gesture cancel and re-grab, matched keyboard action and reduced settle without an unintended commit.                          |
| P2     | Article        |   3 |   2 |   2 |   1 |   3 | Preserve reading position; test media/text fallback and headings at large type.                                                      |
| P2     | Review         |   3 |   2 |   2 |   1 |   3 | Add a scoped no-reviews fixture; ensure ratings read as numbers as well as stars.                                                    |
| P2     | Profile        |   3 |   2 |   2 |   1 |   2 | Test missing photo and long names in both layouts; verify edit doesn't make private status public.                                   |
| P2     | SectionTitle   |   3 |   2 |   2 |   1 |   3 | Keep title and first row together at large type; document no independent motion.                                                     |
| P2     | Note           |   2 |   1 |   2 |   1 |   2 | Make scope and privacy notes secondary to state; don't repeat the screen title (T1).                                                 |
| P2     | Bars           |   3 |   2 |   2 |   2 |   2 | Test zero/exact values and selected series labels; bars animate once, never on every poll.                                           |
| P2     | Sparkline      |   2 |   2 |   2 |   1 |   2 | Add period and descriptive trend in view/read; check flat and unavailable states.                                                    |
| P2     | Counter        |   3 |   2 |   2 |   1 |   3 | Keep bounds and disabled transition clear; repeated plus/minus doesn't move neighboring buttons.                                     |
| P2     | Timer          |   3 |   2 |   2 |   2 |   3 | Distinguish running, paused and zero with a stable reading; don't replay spin on each tick.                                          |
| P2     | Streak         |   3 |   1 |   2 |   2 |   2 | Show reset/rest as well as earned streak; reserve flame for actual milestone.                                                        |
| P2     | Scale          |   3 |   2 |   2 |   1 |   2 | Test no selection, endpoints and arrow/keyboard equivalents with labels, not only mood glyphs.                                       |
| P2     | Canvas         |   1 |   1 |   0 |   1 |   1 | Provide readable bounded fallback and demonstrate why a named kit family can't express the drawing.                                  |

## Built packs (27)

| Impact | Pack      |   A |   S |   V |   M |   C | Top fix / evidence to produce                                                                                                                                 |
| ------ | --------- | --: | --: | --: | --: | --: | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0     | team      |   3 |   2 |   2 |   1 |   2 | `Approval` needs a visible incoming/pending-to-decision path by request; pair `Handover`/`Roster` with a known receiver and durable state (T2).               |
| P0     | requests  |   3 |   2 |   2 |   1 |   2 | `RequestQueue`/`WorkOrder`: keep priority, asset/owner, latest state and time; verify real assign → acknowledged → resolved distinctions (T1/T2).             |
| P0     | booking   |   3 |   2 |   3 |   1 |   3 | Exercise existing `SlotAgenda`/`Slots` and `Waitlist` against real availability, selection/race and offered-seat expiry before proposing another picker (T3). |
| P0     | commerce  |   3 |   2 |   3 |   1 |   2 | Preserve cart line/item modifier and totals through `Checkout` and `OrderStatus`; pending cannot look paid or collected (T3).                                 |
| P0     | money     |   3 |   3 |   2 |   1 |   3 | `MoneyTransfer` shows duplicate protection, failure/retry and exactly reconciled amount; align `Transactions` amounts and units (T2).                         |
| P0     | property  |   3 |   2 |   2 |   1 |   2 | `Inspections` and `RentalApplication`: keep evidence and pending decision separate; show timestamped failure and preserve draft.                              |
| P0     | health    |   3 |   2 |   2 |   2 |   2 | `Medication` / `Vitals`: show when data is stale; keep the dose/unit truthful through acknowledgement; no false completion or idle animation.                 |
| P0     | paperwork |   3 |   2 |   2 |   1 |   2 | `Signature` / `Documents`: track attachment evidence and permission/cancel separately from a signed/filed result; preserve the current file.                  |
| P1     | customers |   3 |   2 |   2 |   1 |   3 | `FollowUpQueue`/`PaymentStatus`: stable due/reference column; link invoice finish to payer record without promising an external effect.                       |
| P1     | events    |   3 |   2 |   3 |   1 |   2 | `RSVP` and `GuestList` need names and status first; prove `Ticket` continuity from selected event to arrival (T1/T4).                                         |
| P1     | places    |   3 |   2 |   2 |   1 |   2 | `DeliveryTracker` / `Departures`: timestamp ETA vs last actual update; show list alternatives and offline snapshot.                                           |
| P1     | data      |   3 |   2 |   3 |   1 |   2 | `Table` / `Board` keep header and numeric rail; preserve filter selection and focus across drag/reassign; offer explicit alternative.                         |
| P1     | projects  |   3 |   2 |   2 |   1 |   2 | `Tasks`/`Gantt`: anchor milestone and owner during reorder; show conflict and last item at phone width without requiring drag.                                |
| P1     | hiring    |   3 |   2 |   2 |   1 |   2 | `ApplicantPipeline` / `Offer`: differentiate drafted, shared and accepted, with job identity and a visible next decision.                                     |
| P1     | inventory |   3 |   2 |   2 |   1 |   2 | `Loans`/`Storage`: surface holder, condition and due/pickup location before notes; separate availability from new request.                                    |
| P1     | community |   3 |   3 |   2 |   2 |   2 | `ModQueue`/`Vote`: preserve item, count or decision through approval, denial and no pending work; avoid a generic success burst.                              |
| P1     | books     |   3 |   3 |   2 |   1 |   3 | `Payroll` / `ProfitLoss`: show period, currency and sources by branch; repeated figures line up and reconcile on receipt (T1).                                |
| P1     | trips     |   3 |   2 |   2 |   1 |   2 | `BagTracker` / `TravelDocs`: last-seen vs live timestamps and scoped unavailable documents; keep offline details readable.                                    |
| P1     | kitchen   |   3 |   2 |   2 |   2 |   2 | `CookSteps` / `GroceryList`: keep active instruction/timer visible; finish one unit of work and permit undo, not a full-screen replay.                        |
| P1     | home      |   3 |   2 |   2 |   2 |   2 | `Devices` / `Chores`: show offline/last update or ownership per item, with no fake successful remote toggle.                                                  |
| P1     | social    |   3 |   2 |   3 |   2 |   2 | `Comments` / `StoryViewer`: distinguish draft/send/read; verify play/pause and caption control across gestures and reduced motion.                            |
| P1     | learning  |   3 |   2 |   3 |   1 |   2 | `Assignments` / `Result`: keep pupil, title, due and submitted status separate; no premature result (T2).                                                     |
| P2     | invest    |   3 |   3 |   2 |   1 |   2 | `Holdings` / `Performance`: period and negative sign visible, explicit stale status, no count-up of an unverified figure.                                     |
| P2     | media     |   3 |   2 |   2 |   1 |   2 | `Library` / `MiniPlayer`: audio title, seeking and paused state stay stable; support unavailable playback without changing identity.                          |
| P2     | mind      |   3 |   2 |   2 |   2 |   2 | `Breathe` / `Entries`: supply non-motion pacing, no idle animation on arrival, and a neutral rest/done state.                                                 |
| P2     | sports    |   3 |   2 |   3 |   2 |   2 | `Scoreboard` / `MatchFeed`: anchor matchup and actual time; distinguish final from live with no score animation on routine refresh.                           |
| P2     | play      |   3 |   2 |   3 |   2 |   2 | `Spinner` / `PassReveal`: verify cancellation and reduced result with privacy preserved; keep a settled result until the next real turn.                      |

The registered Wave 6 pack directories which only contain planning material are not built and have no numeric score. Score them when their definitions exist; don't treat a planning document or old recording as a built pack.

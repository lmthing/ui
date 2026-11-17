# Pack index

A pack is a family of components and archetypes for one kind of app. The Director picks up to three from
the pick lines below and writes them in the brief; every later call for that app sees the core plus those
packs only. A personal app often needs none. Entry format: [../README.md](../README.md).

There are **18 packs**: the ten from the first plan (one renamed and all revised) and eight new ones.

| Pack | Status | Pick line (what the Director reads) | Components | Archetypes |
| --- | --- | --- | --- | --- |
| [booking](booking.md) | revised | Booking time with someone: appointments, classes, slots. Not selling goods (`commerce`) | 8 | 4 |
| [customers](customers.md) | revised | A business keeping track of the people it serves. Not the person's own friends (`social`) | 8 | 3 |
| [commerce](commerce.md) | revised | Selling things for money: a shop, a bakery, a stall. Not booking time (`booking`) | 10 | 4 |
| [money](money.md) | revised | The person's own money: balances, budgets, bills, splitting costs. Not a business's sales (`commerce`) | 9 | 3 |
| [team](team.md) | revised | Staff or volunteers: shifts, tasks, approvals. Not a sports squad (`sports`) | 7 | 3 |
| [data](data.md) | revised | Running something behind the scenes: tables, boards, reports. Not personal tracking (core) | 8 | 3 |
| [social](social.md) | revised | People sharing with each other: posts, comments, follows. Not a business's clients (`customers`) | 9 | 3 |
| [media](media.md) | renamed from `content` | Reading, listening and watching a library. Not one recording on one screen (core `Player`) | 7 | 3 |
| [learning](learning.md) | revised | Teaching and practising: lessons, quizzes, flashcards. Not a team's training rota (`team`) | 7 | 3 |
| [places](places.md) | revised | Where things are and getting there: venues, addresses, deliveries. Not planning a trip (`trips`) | 7 | 3 |
| [health](health.md) | **new** | The body: workouts, medication, measurements, symptoms. Not the mind (`mind`), not food (`kitchen`) | 9 | 4 |
| [mind](mind.md) | **new** | The mind: mood, journaling, meditation, sleep, gratitude. Not the body (`health`) | 8 | 4 |
| [kitchen](kitchen.md) | **new** | Food at home: recipes, meal plans, groceries, the pantry, food logs. Not selling food (`commerce`) | 9 | 4 |
| [home](home.md) | **new** | Running a household: chores, family, pets, plants, cars, care schedules. Not a business team (`team`) | 9 | 4 |
| [trips](trips.md) | **new** | Travelling: itineraries, reservations, packing, journeys. Not organising an event (`events`) | 8 | 4 |
| [events](events.md) | **new** | Organising one gathering: guests, RSVPs, seating, programme, vendors. Not travel (`trips`) | 8 | 4 |
| [inventory](inventory.md) | **new** | Keeping track of things owned: stock, collections, assets, rentals. Not selling them (`commerce`) | 8 | 4 |
| [sports](sports.md) | **new** | A sports team or league: fixtures, scores, standings, lineups. Not a workout (`health`) | 8 | 4 |

Total: 147 pack components and 65 archetypes, all `planned`.

## Common combinations

| App idea | Packs |
| --- | --- |
| Dog walker, hairdresser, tutor (Trot) | booking, customers, money |
| Bakery or market stall with pre-orders | commerce, customers, places |
| Workout and meal tracker | health, kitchen |
| Family organiser with chores and meals | home, kitchen |
| Meditation and mood journal | mind |
| Trip planner with a shared budget | trips, money, places |
| Wedding or party planner | events, money |
| Book club or running club | social, events |
| Language or exam practice | learning |
| Podcast or audiobook library | media |
| Small shop's stock room | inventory, commerce, data |
| Café or salon staff rota | team, booking |
| Sunday league team | sports, social |
| Landlord with a few flats | inventory, customers, money |

## Rules every pack follows

- **Ids are unique** across the core and all packs, and a pack id is never reused as a component id
  (`trips` has `Reservation`, not `Booking`).
- **A pack never depends on another pack.** What three or more packs need moves to the core (`Amount`,
  `Player`, `Progress`). When two packs could both draw a need, each pack's `pick` names the other, and the
  Director's combination table decides which one the app loads.
- **Core first.** A pack component exists only where a core component plus an option cannot say it.
  Each pack file lists what the core already covers for that domain.
- **Aliases scope to the app's packs** (plan 4.6): with `data` loaded `table` resolves to `Table`, without it
  to `List`. Each pack file lists every alias that shadows a core alias; any other alias is unique across
  the core and all packs.
- **Aliases are single lowercase words** with no spaces, as in the built files (`quickactions`,
  `openinghours`). Each word has one owner.
- **Money is numbers.** A model writes amounts as numbers and never a currency: the app's currency is set
  once in the brief, and only core `Amount` may override it. Formatting is core `moneyLine`.
- **Code computes what can be computed.** Totals, counts, shares, balances, statuses that follow from dates
  (overdue), and anything the basket or the records already hold are never model-written props.
- **Tiers per part.** A component's tier is what its main use needs; a part that needs more (send, call,
  pay) is marked in `meta.partTiers` and reads with its own risk mark, as core `Composer` does.
- **Destructive parts confirm.** A part that cancels, removes, declines or deletes is listed in
  `meta.confirmParts`; the kit shows the standard confirm sheet (core `Button` `confirm`) before it acts.
- **Visual variants are one `style` enum**, never a `kind` that only changes the drawing. Product colours
  use the closed `swatch` vocabulary (black, white, grey, navy, blue, green, olive, red, pink, purple,
  yellow, orange, brown, beige), mapped to fixed tokens in `tokens/component.ts`, never theme accents.
- **Every component** has a tier and a `realPath`, two examples in its domain, probes, and a renderer from
  kit bases only. Every pack ships a worked example app (`example.jsonl`) that renders in three presets.
- **Signatures.** An app still has exactly one signature moment. A pack may propose one new signature for a
  component where the core ten do not fit; each proposal is marked and needs a reference mock first.

## Build waves

| Wave | Packs | Why this order |
| --- | --- | --- |
| 1 | booking, customers | Trot, the Phase 1 worked example |
| 2 | health, kitchen, home, money | The most-asked personal apps |
| 3 | commerce, mind, trips, learning | The next most-asked; commerce and trips lean on `Amount` |
| 4 | social, media, events, places | Need `people` and `service` tiers; showcase less often |
| 5 | inventory, data, team, sports | Business back-office and niche; built when misses ask |

Inside a wave, the order follows the off-pack repair codes and `Canvas` misses from the bake-off. A pack
enters live prompts only when every component is `ready` and its worked example renders without issues.

## New kit bases shared by packs

Several packs need the same drawing. These are built once in `src/kit/base/` the first time a pack needs them:

| Base | Draws | First needed by |
| --- | --- | --- |
| `KitSlotGrid` | A grid of time chips, taken ones disabled | booking `Slots` |
| `KitColumns` | Two to five columns of cards that scroll sideways, with a count per column | data `Board` |
| `KitTable` | A compact table with a sticky first column | data `Table`, sports `Standings` |
| `KitSetRow` | A row of small number boxes (sets, reps, weight) with a done tick | health `WorkoutLog` |
| `KitWeekMatrix` | Rows of things by seven day columns with a mark per cell | health `HabitGrid`, kitchen `MealPlan` |
| `KitFlip` | A card with two faces and a flip on press | learning `Flashcard` |
| `KitTicket` | A ticket shape with a perforation and a code area | trips `Reservation`, events `Ticket` |
| `KitScore` | Two sides with large numbers and a status in the middle | sports `Scoreboard` |
| `KitBreath` | A circle that grows and shrinks on a timed rhythm | mind `Breathe` |
| `KitSeatMap` | Round or long tables with seats as dots | events `Seating` |

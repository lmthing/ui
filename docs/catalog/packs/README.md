# Pack index

A pack is a family of components and archetypes for one kind of app. The Director picks up to three from
the pick lines below and writes them in the brief; every later call for that app sees the core plus those
packs only. A personal app often needs none. Entry format: [../README.md](../README.md).

There are **27 packs**: the ten from the first plan (one renamed, all revised), eight earlier additions
and nine newly planned packs.

| Pack                      | Status                 | Pick line (what the Director reads)                                                                                                                                                                                                 | Components | Archetypes |
| ------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------- |
| [booking](booking.md)     | revised                | Booking time with someone: appointments, classes, slots. Not selling goods (`commerce`)                                                                                                                                             | 6          | 4          |
| [customers](customers.md) | revised                | A business keeping track of the people it serves. Not the person's own friends (`social`)                                                                                                                                           | 7          | 4          |
| [commerce](commerce.md)   | revised                | Selling things for money: a shop, a bakery, a stall. Not booking time (`booking`)                                                                                                                                                   | 9          | 6          |
| [money](money.md)         | revised                | The person's own money: balances, budgets, bills, splitting costs, debts and repayment plans. Not a business's sales (`commerce`)                                                                                                   | 8          | 6          |
| [team](team.md)           | revised                | Staff or volunteers: shifts, hours, handovers, approvals. Not a sports squad (`sports`)                                                                                                                                             | 7          | 3          |
| [data](data.md)           | revised                | Running something behind the scenes: tables, boards, reports. Not personal tracking (core)                                                                                                                                          | 7          | 3          |
| [social](social.md)       | revised                | People sharing with each other: posts, comments, follows. Not a business's clients (`customers`)                                                                                                                                    | 8          | 5          |
| [media](media.md)         | renamed from `content` | Reading, listening and watching a library. Not one recording on one screen (core `Player`)                                                                                                                                          | 7          | 3          |
| [learning](learning.md)   | revised                | Teaching and practising: lessons, quizzes, flashcards, classes and homework. Not a team's training rota (`team`)                                                                                                                    | 8          | 4          |
| [places](places.md)       | revised                | Where things are and getting there: venues, addresses, deliveries, departures. Not planning a trip (`trips`)                                                                                                                        | 6          | 3          |
| [health](health.md)       | **new**                | The body: workouts, medication, measurements, symptoms, cycles. Not the mind (`mind`), not food (`kitchen`)                                                                                                                         | 9          | 4          |
| [mind](mind.md)           | **new**                | The mind: mood, journaling, feelings, breathing, sleep. Not the body (`health`)                                                                                                                                                     | 7          | 4          |
| [kitchen](kitchen.md)     | **new**                | Food at home: recipes, meal plans, groceries, the pantry, food logs. Not selling food (`commerce`)                                                                                                                                  | 7          | 5          |
| [home](home.md)           | **new**                | Running a household: chores, family, pets, plants, cars, the house and its devices. Not a business team (`team`)                                                                                                                    | 7          | 5          |
| [trips](trips.md)         | **new**                | Travelling: itineraries, reservations, packing, documents, weather. Not organising an event (`events`)                                                                                                                              | 7          | 5          |
| [events](events.md)       | **new**, additional    | Organising one gathering: guests, RSVPs, seating, tickets, suppliers, gifts. Not travel (`trips`)                                                                                                                                   | 8          | 4          |
| [inventory](inventory.md) | **new**                | Keeping track of things owned: stock, collections, storage, loans, warranties, rentals. Not selling them (`commerce`)                                                                                                               | 8          | 4          |
| [sports](sports.md)       | **new**, additional    | A sports team or league: fixtures, scores, standings, lineups, availability. Not a workout (`health`)                                                                                                                               | 7          | 4          |
| [play](play.md)           | planned                | Playing a game together: round scores, dice, a spinner, turns, host-led trivia and random teams. Not league fixtures and standings (`sports`), not graded practice (`learning`), not household duties (`home`)                      | 6          | 3          |
| [requests](requests.md)   | planned                | Requests moving through a service queue: repairs, maintenance, support tickets, work orders. Not booking time (`booking`), not a simple repair attached to something owned (`inventory`), not arbitrary records on a board (`data`) | 5          | 3          |
| [community](community.md) | planned                | A club, association or neighbourhood group run by its members: dues, notices, votes, sign-ups, minutes. Not sharing posts (`social`), not organising one gathering (`events`), not staff shifts (`team`)                            | 5          | 3          |
| [projects](projects.md)   | planned                | Work with deliverables: projects, tasks, milestones, time spent. Not running day-to-day operations (`data`), not staff shifts (`team`)                                                                                              | 5          | 4          |
| [paperwork](paperwork.md) | planned                | Life admin: documents, renewals, receipts, forms to sign and deadlines. Not travel documents (`trips`), owned things' warranties (`inventory`), client agreements (`customers`) or payments to track (`money`)                      | 5          | 4          |
| [hiring](hiring.md)       | planned                | Finding people or work: job posts, applicants, interviews, offers and your own applications. Not staff already hired (`team`), not clients (`customers`), not a generic kanban (`data`)                                             | 6          | 4          |
| [property](property.md)   | planned                | Running rented property: units, occupancy, rent, viewings, inspections, meters. Not owned things or one listing or lease (`inventory`), not repairs and maintenance requests (`requests`)                                           | 5          | 4          |
| [invest](invest.md)       | planned                | Investments over time: holdings, allocation, watchlists, performance, dividends, savings goals. Not day-to-day spending and bills (`money`), not a business's books (`books`, proposed)                                             | 5          | 4          |
| [books](books.md)         | planned                | A small business's own accounts: income, expenses, profit, tax set aside. Not personal money (`money`), client invoices (`customers`), or selling goods (`commerce`)                                                                | 5          | 4          |

Total: 180 pack components and 109 pack archetypes, all `planned`. With the 45 core components and 17 core
archetypes, the catalog plans 225 components and 126 archetypes. An app can use 45 core components plus
at most 26 pack components; the Writer's choices omit code-owned entries, including core `TabBar`.

`events` and `sports` are the packs added beyond the first plan's ten and the five the research suggested
(`health`, `kitchen`, `home`, `trips`, `inventory`); `mind` was split out of `health` because people log
mood and sleep apart from workouts and medicine.

## Common combinations

| App idea                                                               | Packs                        |
| ---------------------------------------------------------------------- | ---------------------------- |
| Dog walker, hairdresser, tutor (Trot)                                  | booking, customers, books    |
| Bakery or market stall with pre-orders                                 | commerce, customers, places  |
| Workout and meal tracker                                               | health, kitchen              |
| Family organiser with chores and meals                                 | home, kitchen                |
| Meditation and mood journal                                            | mind                         |
| Trip planner with a shared budget                                      | trips, money, places         |
| Wedding or party planner                                               | events, money                |
| Book club or running club                                              | social, events               |
| Language or exam practice                                              | learning                     |
| Podcast or audiobook library                                           | media                        |
| Small shop's stock room                                                | inventory, commerce, data    |
| Café or salon staff rota                                               | team, booking                |
| Sunday league team                                                     | sports, social               |
| Landlord with a few flats and tenant maintenance reports               | property, requests           |
| Pub-quiz night with guest invitations and RSVPs                        | play, events                 |
| Family organiser with an evening game night                            | home, play                   |
| Bike repair shop with a queue, appointments and client bills           | requests, booking, customers |
| Residents' association with neighbour posts                            | community, social            |
| School parents' association running its annual fair                    | community, events            |
| Freelancer's deliverables, client billing and tax-year accounts        | projects, customers, books   |
| Home renovation with tools, warranties and shared costs                | projects, inventory, money   |
| Household admin with chores, policy renewals and bills                 | home, paperwork, money       |
| Freelancer's tax-prep evidence and expense log                         | paperwork, money             |
| Café hiring for summer and then running the staff rota                 | hiring, team                 |
| Trot recruiting another walker while managing appointments and clients | hiring, booking, customers   |
| Stock, crypto or pension portfolio with allocation and dividends       | invest                       |
| Kids' long-term savings with pocket money and household chores         | invest, money, home          |

## Rules every pack follows

- **Ids are unique** across the core and all packs, and a pack id is never reused as a component id
  (`trips` has `Reservation`, not `Booking`).
- **A pack never depends on another pack.** What three or more packs need moves to the core (`Amount`,
  `Player`, `Progress`). When two packs could both draw a need, each pack's `pick` names the other, and the
  Director's combination table decides which one the app loads.
- **Core first.** A pack component exists only where a core component plus an option cannot say it.
  Each pack file lists what the core already covers for that domain.
- **Writers use strict structured output.** `writerFormat(registry)` limits `c` to model-writable ids in
  the core plus the chosen packs, with props from each component's Zod schema. There are no component
  alias lists or off-pack name fallbacks. Without a pack, the Director or Writer picks a core component
  for the need, or records a `Canvas` miss. The format implementation is pending.
- **Money is numbers.** A model writes amounts as numbers and never a currency: the app's currency is set
  once in the brief (a trip app also sets the destination's), and only core `Amount` may override it.
  Formatting is core `moneyLine`.
- **Code computes what can be computed.** A model writes seed content, including values a real app would
  store on a record (a post's likes, an item's quantity, a lesson's state). It never writes a value that
  follows from other props or from the host's state: totals and subtotals, shares, balances and settle-ups,
  statuses that follow from dates or ranges (overdue, open now, out of range), basket counts, distances from
  the person's location, or anything a later prop would contradict.
- **Counts and text follow plan 4.5.** A list of rows holds at most 6 items and shows a quiet "and N more"
  line beyond that; a row title is at most text(32) and row meta text(36). Plan 4.5 says 28 for a row title;
  built `Timeline` titles use 32 and `People` names use 24, so this folder proposes amending rule 6 to 32.
  Components whose job is density are exempt and say so with `meta.dense` and their own limits:
  grids and matrices (`Slots`, `Roster`, `MealPlan`, `Timetable`, `HabitGrid`, `Table`, `Board`, `Bracket`,
  `Standings`, `Seating`, `FindDate`), documents of lines (`Invoice`, `OrderSummary`, `Cart`, `Timesheet`),
  sequences shown one step at a time (`CookSteps`), recipes' and schedules' own lists (`Ingredients`,
  `GroceryList`, `Medication`, `Agenda`, `BabyLog`, `Workout`, `ServiceMenu`, `ChapterList`, `GuestList`,
  `Itinerary`, `PackingList`, `Registry`, `Squad`, `Lineup`, `MatchFeed`, `Storage`),
  and tile grids (`ProductGrid`, `Library`, `Achievements`, `Factors`, `Feelings`, `SymptomLog`, `Stories`,
  `Path`, `Things`, `CareSchedule`, `Pantry`, `FoodLog`, `Devices`), and feeds of posts or entries whose
  items are not rows (`Feed`, `Comments`, `Entries`). Chart points and keypad digits are values, not
  rows.
- **Weight.** A pack component is weight 2 unless it is dense (weight 3) or says otherwise.
- **Archetype and layout ids are their own namespace**, unique across the core and all packs; they may
  equal a component id because the Director names archetypes in a separate field. **Pending:** check
  namespace uniqueness, that layouts exist and that `defaultLayout` names one. Scanning checks file names
  and exports; the pack checker only checks the archetype count.
- **Tiers per part.** A component's tier is what its main use needs; a part that needs more (send, call,
  pay) is marked in `meta.partTiers` and reads with its own risk mark, as core `Composer` does.
- **Destructive parts confirm.** A part that cancels, removes, declines or deletes is listed in
  `meta.confirmParts`; the kit shows the standard confirm sheet (core `Button` `confirm`) before it acts.
  **Pending:** dispatch `confirmParts` through the shared runtime. Metadata and part-name checks exist;
  only `Button.confirm` opens a confirmation today.
- **Visual variants are one `style` enum**, never a `kind` that only changes the drawing. Product colours
  use the closed `swatch` vocabulary (black, white, grey, navy, blue, green, olive, red, pink, purple,
  yellow, orange, brown, beige), mapped to fixed tokens in `tokens/component.ts`, never theme accents.
- **Every component** has a tier and a `realPath`, two examples in its domain, probes, and a renderer from
  kit bases only. Every pack ships a worked example app (`example.jsonl`) that renders in three presets.
- **Signatures.** An app still has exactly one signature moment. A pack may propose one new signature for a
  component where the core ten do not fit; each proposal is marked and needs a reference mock first.

## Build waves

All 27 packs have folder scaffolds only. No domain component, archetype, `pack.ts`, worked example or
domain probe is built. Shared metadata, entry scanning/generation, prompt builders, pack checks and probe
runners exist; the waves below remain planned. The [build plan](build-plan.md) defines the prerequisites,
per-pack workflow and gates.

| Wave | Packs                                                                     | Why this order                                                                                     |
| ---- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 0    | Step 0 prerequisites                                                      | Every wave depends on them                                                                         |
| 1    | booking, customers                                                        | Trot, the Phase 1 worked example                                                                   |
| 2    | health, kitchen, home, money, play                                        | The most-asked personal apps; `play` turns the most common `Canvas` miss (games) into a showcase   |
| 3    | commerce, mind, trips, learning, requests, property                       | Next most-asked; `requests` and `property` complete the landlord combination                       |
| 4    | social, media, events, places, community                                  | Need `people` and `service` tiers; groups build on social and events                               |
| 5    | inventory, data, team, sports, projects, paperwork, books, invest, hiring | Business back-office and niche; order inside the wave follows real `Canvas` misses and forced fits |

Inside a wave, the order follows the off-pack repair codes and `Canvas` misses from the bake-off. A pack
enters live prompts only when every component is `ready` and its worked example renders without issues.
**Pending:** enforce this at pack level. The registry filters draft components individually, so a ready
sibling from an incomplete pack can enter; the Director's pack index includes every supplied pack.

## New kit bases shared by packs

Several packs need the same drawing. These are built once in `src/kit/base/` the first time a pack needs them:

| Base            | Draws                                                                      | First needed by                        |
| --------------- | -------------------------------------------------------------------------- | -------------------------------------- |
| `KitSlotGrid`   | A grid of time chips, taken ones disabled                                  | booking `Slots`                        |
| `KitColumns`    | Two to five columns of cards that scroll sideways, with a count per column | data `Board`                           |
| `KitTable`      | A compact table with a sticky first column                                 | data `Table`, sports `Standings`       |
| `KitSetRow`     | A row of small number boxes (sets, reps, weight) with a done tick          | health `Workout`                       |
| `KitWeekMatrix` | Rows of things by seven day columns with a mark per cell                   | health `HabitGrid`, kitchen `MealPlan` |
| `KitFlip`       | A card with two faces and a flip on press                                  | learning `Flashcard`                   |
| `KitTicket`     | A ticket shape with a perforation and a code area                          | trips `Reservation`, events `Ticket`   |
| `KitScore`      | Two sides with large numbers and a status in the middle                    | sports `Scoreboard`                    |
| `KitBreath`     | A circle that grows and shrinks on a timed rhythm                          | mind `Breathe`                         |
| `KitSeatMap`    | Round or long tables with seats as dots                                    | events `Seating`                       |

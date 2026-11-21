# Pack kit bases

## Map

Wave and pack order follow [build-plan](build-plan.md); component order follows each pack file.
Names in the existing column are current `src/kit` exports. Empty and loading views also compose
`KitEmpty` and `KitSkeleton`; new drawings keep their own loading geometry.

### Wave 1

| Wave | Pack | Component | Drawing needs | Existing bases | New bases |
| --- | --- | --- | --- | --- | --- |
| 1 | booking | ServiceMenu | Group headings, photo rows, duration, price, book | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitAction`, `KitEmpty`, `KitSkeleton` | None |
| 1 | booking | Slots | Selected time grid, disabled taken times, list | `KitCard`, `KitText`, `KitRow` | `KitSlotGrid` |
| 1 | booking | Availability | Seven switches, paired time fields, break | `KitCard`, `KitRow`, `KitTrail`, `KitGrid`, `KitInput`, `KitText` | None |
| 1 | booking | StaffPicker | Avatar rail, selected ring, names | `KitCard`, `KitStrip`, `KitGrid`, `KitRow`, `KitPhoto`, `KitText` | None |
| 1 | booking | Appointment | Date headline, details, badge, edit actions | `KitCard`, `KitContent`, `KitText`, `KitTrail`, `KitGrid`, `KitAction` | None |
| 1 | booking | Waitlist | Position number, queue line, join/leave | `KitCard`, `KitContent`, `KitText`, `KitAction` | None |
| 1 | booking | ClassRoster | Attendee check-in toggles, walk-in add, waitlist promotion | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitCheck`, `KitTrail`, `KitAction` | None |
| 1 | booking | SessionPack | Credit balance bar, expiry note, redeem/renew actions | `KitCard`, `KitContent`, `KitText`, `KitMeter`, `KitTrail`, `KitAction` | None |
| 1 | customers | ClientCard | Portrait, summary, tags, contact actions | `KitCard`, `KitContent`, `KitPhoto`, `KitText`, `KitTrack`, `KitChip`, `KitAction` | None |
| 1 | customers | ClientHistory | Dated icon rows, signed amounts | `KitCard`, `KitRow`, `KitTime`, `KitIcon`, `KitText`, `KitTrail` | None |
| 1 | customers | Invoice | Document headings, quantity/price lines, totals | `KitCard`, `KitContent`, `KitRow`, `KitGrid`, `KitText`, `KitTrail`, `KitAction` | None |
| 1 | customers | PaymentStatus | Status headline, amount, dates, actions | `KitCard`, `KitContent`, `KitText`, `KitIcon`, `KitAction` | None |
| 1 | customers | Review | Stars, five horizontal bars, review/reply rows | `KitCard`, `KitRow`, `KitContent`, `KitText`, `KitScaleTrack`, `KitMeter`, `KitAction` | None |
| 1 | customers | Loyalty | Stamp circles, reward line, redeem | `KitCard`, `KitContent`, `KitGrid`, `KitDayMark`, `KitText`, `KitAction` | None |
| 1 | customers | Agreement | Bounded terms, agreement tick, typed name | `KitCard`, `KitText`, `KitCheck`, `KitInput` | `KitScroll` |
| 1 | customers | FollowUpQueue | Prioritized client rows, due badges, done/snooze/remind | `KitCard`, `KitRow`, `KitTime`, `KitText`, `KitTrail`, `KitCheck`, `KitAction` | None |
| 1 | customers | SavedItems | Grouped billing rate rows, tax marks, add/remove | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |

### Wave 2

| Wave | Pack | Component | Drawing needs | Existing bases | New bases |
| --- | --- | --- | --- | --- | --- |
| 2 | health | Workout | Labelled number boxes, set ticks, rest clock | `KitCard`, `KitText`, `KitInput`, `KitCheck`, `KitAction` | `KitSetRow` |
| 2 | health | Exercise | Media, muscle tags, cue rows, best/last | `KitCard`, `KitPhoto`, `KitPlayback`, `KitContent`, `KitRow`, `KitText`, `KitTrack`, `KitChip`, `KitAction` | None |
| 2 | health | Measurements | Long trend, dashed goal, range tabs | `KitCard`, `KitText`, `KitTrack`, `KitChip`, `KitAction` | `KitLinePlot` |
| 2 | health | Medication | Time groups, doses, ticks, skip, refill mark | `KitCard`, `KitRow`, `KitTime`, `KitText`, `KitTrail`, `KitCheck`, `KitAction` | None |
| 2 | health | HabitGrid | Habits by seven days, ticks, today column | `KitCard`, `KitText`, `KitIcon`, `KitCheck` | `KitTable`, `KitWeekMatrix` |
| 2 | health | Vitals | Reading/unit, normal band, marker, date | `KitCard`, `KitRow`, `KitText`, `KitAction` | `KitRangeBand` |
| 2 | health | SymptomLog | Grouped chips, chosen severity control | `KitCard`, `KitText`, `KitTrack`, `KitChip`, `KitSlider`, `KitInput` | None |
| 2 | health | Cycle | Segmented day ring, current day, phase text | `KitCard`, `KitText`, `KitContent`, `KitAction` | `KitRadialTrack` |
| 2 | health | ActivityRings | Concentric goal arcs, labelled values | `KitCard`, `KitGrid`, `KitRow`, `KitText` | `KitRadialTrack` |
| 2 | health | CardioSession | Elapsed clock, metric grid, split pace bars, controls | `KitCard`, `KitGrid`, `KitRow`, `KitMeter`, `KitTime`, `KitText`, `KitAction` | None |
| 2 | health | TrainingPlan | Week tabs, day workout ticks, rest/duration tags | `KitCard`, `KitTrack`, `KitChip`, `KitRow`, `KitCheck`, `KitTrail`, `KitText` | None |
| 2 | kitchen | Ingredients | Grouped checks, amounts, servings, unit switch | `KitCard`, `KitRow`, `KitText`, `KitCheck`, `KitAction`, `KitTrack`, `KitChip` | None |
| 2 | kitchen | CookSteps | One large step, ingredients, timer, next/back | `KitCard`, `KitContent`, `KitText`, `KitTrack`, `KitChip`, `KitAction` | None |
| 2 | kitchen | MealPlan | Days by meals, photos, empty add cells | `KitCard`, `KitText`, `KitPhoto`, `KitAction` | `KitTable`, `KitWeekMatrix` |
| 2 | kitchen | GroceryList | Aisle headings, quantity checks, add field | `KitCard`, `KitRow`, `KitText`, `KitCheck`, `KitInput` | None |
| 2 | kitchen | Pantry | Food tiles, quantities, expiry marks, remove | `KitCard`, `KitGrid`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 2 | kitchen | FoodLog | Meal groups, food rows, calorie total/target | `KitCard`, `KitRow`, `KitText`, `KitMeter`, `KitAction` | None |
| 2 | kitchen | KitchenTimers | Named rings, countdowns, pause, add minute | `KitCard`, `KitGrid`, `KitRow`, `KitRing`, `KitText`, `KitAction` | None |
| 2 | kitchen | NutritionFacts | Serving stepper, macro share bar, nutrient/allergen rows | `KitCard`, `KitStepper`, `KitShare`, `KitRow`, `KitTrack`, `KitChip`, `KitText`, `KitAction` | None |
| 2 | home | Chores | Avatar rows, repeat/due, points, tick | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail`, `KitCheck` | None |
| 2 | home | Rewards | Filled jars, portraits, prize shelf, claim | `KitCard`, `KitGrid`, `KitRow`, `KitPhoto`, `KitStrip`, `KitIcon`, `KitText`, `KitAction` | `KitJar` |
| 2 | home | CareSchedule | Care tiles, last/next dates, overdue, done | `KitCard`, `KitGrid`, `KitRow`, `KitIcon`, `KitText`, `KitTrail`, `KitAction` | None |
| 2 | home | Turns | Current portrait, next people, advance/skip | `KitCard`, `KitContent`, `KitPhoto`, `KitRow`, `KitText`, `KitAction` | None |
| 2 | home | Agenda | Day headings, time rows, initials, conflicts | `KitCard`, `KitRow`, `KitTime`, `KitPhoto`, `KitText`, `KitTrail`, `KitAction` | None |
| 2 | home | BabyLog | Start/stop tiles, running clock, dated log | `KitCard`, `KitGrid`, `KitTile`, `KitRow`, `KitTime`, `KitText`, `KitAction` | None |
| 2 | home | Devices | Room/scene tiles, switches, set point, range | `KitCard`, `KitGrid`, `KitRow`, `KitIcon`, `KitText`, `KitTrail`, `KitSlider`, `KitAction` | `KitRangeBand` |
| 2 | home | CameraFeed | Frame preview, arming mode chips, talk/siren, event log | `KitCard`, `KitPlayback`, `KitViewfinder`, `KitPhoto`, `KitTrack`, `KitChip`, `KitRow`, `KitTime`, `KitText`, `KitAction` | None |
| 2 | home | Routines | Trigger/action rule rows, enable switches, run actions | `KitCard`, `KitRow`, `KitIcon`, `KitText`, `KitTrail`, `KitAction` | None |
| 2 | money | AccountCard | Coloured account cards, balance, sideways rail | `KitCard`, `KitStrip`, `KitRow`, `KitContent`, `KitText` | None |
| 2 | money | Transactions | Day headings, category icons, signed amounts | `KitCard`, `KitRow`, `KitIcon`, `KitText`, `KitTrail` | None |
| 2 | money | Bills | Due/subscription rows, paid ticks, totals | `KitCard`, `KitRow`, `KitIcon`, `KitText`, `KitCheck`, `KitTrail` | None |
| 2 | money | Split | Portrait balances, settle rows, expense list | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitAction` | None |
| 2 | money | AmountPad | Large amount, decimal keypad, backspace, note | `KitCard`, `KitText`, `KitInput` | `KitNumberPad` |
| 2 | money | PriceChart | Price line, current/change, range tabs | `KitCard`, `KitText`, `KitTrack`, `KitChip` | `KitLinePlot` |
| 2 | money | Loan | Terms, next principal/interest, schedule rows | `KitCard`, `KitContent`, `KitRow`, `KitGrid`, `KitText`, `KitShare`, `KitAction` | None |
| 2 | money | Payoff | Headline, debt order, balance line, extra input | `KitCard`, `KitContent`, `KitRow`, `KitText`, `KitTrack`, `KitChip`, `KitInput`, `KitAction` | `KitLinePlot` |
| 2 | money | CardControls | Card header, freeze switch, channel toggles, spend slider, masked digits | `KitCard`, `KitRow`, `KitTrail`, `KitSlider`, `KitText`, `KitAction` | None |
| 2 | money | MoneyTransfer | Recipient row, source selector, keypad amount, speed chips, QR tab | `KitCard`, `KitRow`, `KitPhoto`, `KitNumberPad`, `KitTrack`, `KitChip`, `KitInput`, `KitCode`, `KitText`, `KitAction` | None |
| 2 | money | CreditScore | Multi-zone 300–850 band gauge, delta, bureau date, rated factor rows | `KitCard`, `KitRangeBand`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 2 | play | ScoreSheet | Sticky players, round headers, editable totals | `KitCard`, `KitText`, `KitInput`, `KitTrack`, `KitChip`, `KitAction` | `KitTable` |
| 2 | play | Dice | Pip/number faces, held marks, sum, roll | `KitCard`, `KitGrid`, `KitText`, `KitAction` | `KitDiceFace` |
| 2 | play | Spinner | Wheel or moving strip, pointer, result | `KitCard`, `KitText`, `KitAction` | `KitWheel` |
| 2 | play | Trivia | Hidden/revealed answer, photo, large question | `KitCard`, `KitContent`, `KitPhoto`, `KitText`, `KitAction` | None |
| 2 | play | TurnOrder | Circular player order or queue, current, lap | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitAction` | `KitOrbit` |
| 2 | play | TeamPicker | Counted team columns or grouped player rows | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitAction` | `KitColumns` |
| 2 | play | LifeCounter | 2–6 rotated seat pads, large life totals, step controls, sub-counters | `KitCard`, `KitGrid`, `KitRow`, `KitText`, `KitAction` | None |
| 2 | play | PassReveal | Player privacy curtain, hold/tap flip reveal, next-player handoff | `KitCard`, `KitFlip`, `KitText`, `KitAction` | None |
| 2 | play | CardDeck | Draw pile counter, revealed card stack or fan, discard count, reshuffle | `KitCard`, `KitFlip`, `KitStrip`, `KitText`, `KitAction` | None |
| 2 | play | BuzzerPad | 2–4 corner color pads, locked winner delta, host reset | `KitCard`, `KitGrid`, `KitTile`, `KitText`, `KitAction` | None |

### Wave 3

| Wave | Pack | Component | Drawing needs | Existing bases | New bases |
| --- | --- | --- | --- | --- | --- |
| 3 | commerce | Product | Description, prices, stock, save, bottom add bar | `KitCard`, `KitContent`, `KitText`, `KitTrail`, `KitAction` | None |
| 3 | commerce | ProductGrid | Two-column photo cards or menu rows, quick add | `KitCard`, `KitGrid`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail`, `KitAction` | None |
| 3 | commerce | VariantPicker | Named/size/swatch choices, unavailable marks | `KitCard`, `KitText`, `KitTrack`, `KitChip` | None |
| 3 | commerce | Cart | Photo lines, quantity controls, promo, totals | `KitCard`, `KitRow`, `KitPhoto`, `KitGrid`, `KitText`, `KitAction`, `KitInput` | None |
| 3 | commerce | CartBar | Bottom count, amount, basket link | `KitCard`, `KitBlock`, `KitText`, `KitAction` | None |
| 3 | commerce | Checkout | Mode/payment choices, details, total, place | `KitCard`, `KitText`, `KitTrack`, `KitChip`, `KitRow`, `KitAction` | None |
| 3 | commerce | OrderSummary | Receipt heading, quantity/price lines, totals | `KitCard`, `KitContent`, `KitRow`, `KitGrid`, `KitText`, `KitAction` | None |
| 3 | commerce | OrderStatus | Step track, labels/times, current, next | `KitCard`, `KitStepsTrack`, `KitRow`, `KitText`, `KitTime`, `KitAction` | None |
| 3 | commerce | Promo | Tinted offer, photo, code link, expiry | `KitCard`, `KitPhoto`, `KitContent`, `KitText`, `KitAction` | None |
| 3 | commerce | SizeGuide | Unit switch, measurement table, fit-scale band, model note | `KitCard`, `KitTrack`, `KitChip`, `KitTable`, `KitRangeBand`, `KitText` | None |
| 3 | commerce | SavedList | Saved photo cards/rows, price deltas, move/alert/claim | `KitCard`, `KitGrid`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail`, `KitInput`, `KitAction` | None |
| 3 | mind | Entries | Month groups, mood face, tags, thumbnail | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTrack`, `KitChip`, `KitScaleTrack` | None |
| 3 | mind | Factors | Selected icon tile grid | `KitCard`, `KitGrid`, `KitTile`, `KitText` | None |
| 3 | mind | Feelings | Family grid, selected word chips | `KitCard`, `KitGrid`, `KitText`, `KitTrack`, `KitChip` | None |
| 3 | mind | Breathe | Growing circle, phase word, remaining rounds | `KitCard`, `KitText`, `KitAction` | `KitBreath` |
| 3 | mind | SleepLog | Sleep/awake share bar, times, quality, average | `KitCard`, `KitContent`, `KitText`, `KitShare`, `KitScaleTrack`, `KitAction` | None |
| 3 | mind | Soundscape | Icon tiles, independent volume sliders, play | `KitCard`, `KitGrid`, `KitRow`, `KitIcon`, `KitText`, `KitSlider`, `KitAction` | None |
| 3 | mind | Patterns | Finding sentences, paired comparison bars | `KitCard`, `KitRow`, `KitText`, `KitBars` | None |
| 3 | mind | ThoughtRecord | Situation/thought boxes, distortion chips, reframe box, before/after mood | `KitCard`, `KitTextArea`, `KitTrack`, `KitChip`, `KitScaleTrack`, `KitText`, `KitAction` | None |
| 3 | trips | Itinerary | Folded day groups, timed stops, travel legs | `KitCard`, `KitRow`, `KitTime`, `KitIcon`, `KitText` | None |
| 3 | trips | Reservation | Perforated ticket/pass, route times, reference | `KitText`, `KitRow`, `KitGrid`, `KitIcon`, `KitAction` | `KitTicket`, `KitCode` |
| 3 | trips | PackingList | Grouped quantity checks, packed share, add | `KitCard`, `KitRow`, `KitText`, `KitCheck`, `KitMeter`, `KitInput` | None |
| 3 | trips | Weather | Today icon/high/low, forecast strip, offline | `KitCard`, `KitContent`, `KitIcon`, `KitText`, `KitStrip`, `KitRow`, `KitEmpty` | None |
| 3 | trips | TravelDocs | Masked document rows, owner, expiry warnings | `KitCard`, `KitRow`, `KitIcon`, `KitText`, `KitTrail` | None |
| 3 | trips | Converter | Paired amount fields, swap, rate date | `KitCard`, `KitRow`, `KitInput`, `KitText`, `KitAction` | None |
| 3 | trips | Clocks | Place/time grid, offsets, day/night icons | `KitCard`, `KitGrid`, `KitRow`, `KitText`, `KitIcon` | None |
| 3 | trips | FlightStatus | Flight route progress arc, status pill, times grid, terminal/gate, refresh | `KitCard`, `KitRouteStop`, `KitGrid`, `KitTime`, `KitTrail`, `KitText`, `KitAction` | None |
| 3 | trips | BagTracker | Bag selector, scan milestone track, timestamps, carousel pill, report | `KitCard`, `KitStepsTrack`, `KitRow`, `KitTime`, `KitTrail`, `KitText`, `KitAction` | None |
| 3 | trips | CabinSeats | Row-by-column seat grid with aisle gaps, tier legend, upgrade fee | `KitCard`, `KitTrack`, `KitChip`, `KitText`, `KitAction` | `KitSeatGrid` |
| 3 | learning | Lesson | Explanation, photo, tinted example, continue | `KitCard`, `KitContent`, `KitPhoto`, `KitBlock`, `KitText`, `KitAction` | None |
| 3 | learning | Quiz | Choices, typed answer, paired match columns | `KitCard`, `KitText`, `KitOption`, `KitInput`, `KitGrid`, `KitChip`, `KitPhoto`, `KitAction` | None |
| 3 | learning | Flashcard | Two card faces, hidden answer, review controls | `KitCard`, `KitPhoto`, `KitText`, `KitAction` | `KitFlip` |
| 3 | learning | Path | Winding linked nodes, locked/current, trophies | `KitCard`, `KitIcon`, `KitText`, `KitAction` | `KitPath` |
| 3 | learning | Result | Score, counts, time, points, mistake rows | `KitCard`, `KitContent`, `KitGrid`, `KitRow`, `KitText`, `KitAction` | None |
| 3 | learning | Achievements | Badge grid, earned dates, locked explanation | `KitCard`, `KitGrid`, `KitTile`, `KitIcon`, `KitText` | None |
| 3 | learning | Timetable | Week/day selectors, period rows, current mark | `KitCard`, `KitText`, `KitTrack`, `KitChip`, `KitRow`, `KitTime`, `KitTrail` | `KitTable`, `KitWeekMatrix` |
| 3 | learning | Assignments | Subject marks, due/grade rows, done checks | `KitCard`, `KitRow`, `KitIcon`, `KitText`, `KitCheck`, `KitTrail` | None |
| 3 | learning | WorkedSolution | Problem statement, numbered derivation steps, code/equation block, answer pill | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail`, `KitAction` | `KitCodeBlock` |
| 3 | learning | Gradebook | Course score headline, weighted category meters, expandable item rows | `KitCard`, `KitRow`, `KitMeter`, `KitTrail`, `KitText` | None |
| 3 | learning | SpeechCheck | Target phrase, phonetic hint, reference audio, mic button, word pills | `KitCard`, `KitTrack`, `KitChip`, `KitText`, `KitAction` | `KitMicCapture` |
| 3 | requests | RequestQueue | Status groups, urgency/deadline rows, tabs | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitTrack`, `KitChip`, `KitAction` | None |
| 3 | requests | RequestTriage | Priority/queue selectors, duplicates, reason | `KitCard`, `KitText`, `KitTrack`, `KitChip`, `KitOption`, `KitRow`, `KitInput`, `KitAction` | None |
| 3 | requests | RequestThread | Authored replies/photos, event rows, audience | `KitCard`, `KitRow`, `KitBubble`, `KitPhoto`, `KitText`, `KitIcon`, `KitTrack`, `KitChip`, `KitTextArea`, `KitAction` | None |
| 3 | requests | WorkOrder | Work document, required checks, parts, clock | `KitCard`, `KitRow`, `KitGrid`, `KitText`, `KitCheck`, `KitInput`, `KitTrack`, `KitChip`, `KitAction` | None |
| 3 | requests | RequestResolution | Outcome choices, evidence, verification, reopen | `KitCard`, `KitText`, `KitTrack`, `KitChip`, `KitCheck`, `KitGrid`, `KitPhoto`, `KitInput`, `KitAction` | None |
| 3 | requests | SlaPolicy | Policy tier badge, first-response status row, resolution countdown bar | `KitCard`, `KitRow`, `KitMeter`, `KitTrail`, `KitTime`, `KitText` | None |
| 3 | requests | CannedReplies | Category filter chips, template preview rows, insert-draft actions | `KitCard`, `KitTrack`, `KitChip`, `KitRow`, `KitText`, `KitAction` | None |
| 3 | property | Units | Occupancy photo rows/cards, date field, badges | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail`, `KitInput` | None |
| 3 | property | RentRoll | Ledger sections, amounts, receipt/void actions | `KitCard`, `KitRow`, `KitGrid`, `KitText`, `KitTrail`, `KitAction` | None |
| 3 | property | Viewings | Date/time rows/cards, outcome choices, actions | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitTrack`, `KitChip`, `KitAction` | None |
| 3 | property | Inspections | Room selector, condition choices, notes/photos | `KitCard`, `KitRow`, `KitText`, `KitTrack`, `KitChip`, `KitInput`, `KitGrid`, `KitPhoto`, `KitAction` | None |
| 3 | property | Meters | Meter selectors, value/history rows, evidence | `KitCard`, `KitRow`, `KitText`, `KitTrack`, `KitChip`, `KitPhoto`, `KitAction` | None |
| 3 | property | RentalApplication | Applicant summary, income-to-rent ratio, screening pills, decision bar | `KitCard`, `KitRow`, `KitGrid`, `KitTrail`, `KitInput`, `KitText`, `KitAction` | None |
| 3 | property | LeaseRenewal | Current vs proposed rent comparison, term cards, deadline, response bar | `KitCard`, `KitRow`, `KitGrid`, `KitOption`, `KitInput`, `KitText`, `KitAction` | None |

### Wave 4

| Wave | Pack | Component | Drawing needs | Existing bases | New bases |
| --- | --- | --- | --- | --- | --- |
| 4 | social | Feed | Author/photo cards, clipped text, reaction counts | `KitCard`, `KitRow`, `KitContent`, `KitPhoto`, `KitText`, `KitAction` | None |
| 4 | social | Post | Full text, photo carousel, reaction/more bar | `KitCard`, `KitRow`, `KitContent`, `KitPhoto`, `KitStrip`, `KitText`, `KitAction` | None |
| 4 | social | Comments | Author rows, one-level replies, like/reply | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitAction` | None |
| 4 | social | Poll | Question, vote choices, result bars/tick | `KitCard`, `KitRow`, `KitText`, `KitOption`, `KitMeter`, `KitCheck` | None |
| 4 | social | Stories | Avatar rail, unseen rings, own add | `KitCard`, `KitStrip`, `KitRow`, `KitPhoto`, `KitText`, `KitAction` | None |
| 4 | social | EventCard | Date block, photo, attendee stack, join | `KitCard`, `KitContent`, `KitPhoto`, `KitGrid`, `KitText`, `KitAvatarStack`, `KitAction` | None |
| 4 | social | Challenge | Goal bar, own share, top-three ranking | `KitCard`, `KitContent`, `KitMeter`, `KitRow`, `KitRank`, `KitText`, `KitAction` | None |
| 4 | social | Invite | Invite code, QR, joined count, copy/share | `KitCard`, `KitContent`, `KitText`, `KitAction` | `KitCode` |
| 4 | social | ActivityFeed | Time-grouped notification rows, actor avatars, thumbnails, follow/accept | `KitCard`, `KitRow`, `KitPhoto`, `KitIcon`, `KitText`, `KitAction` | None |
| 4 | social | Groups | Community cover/icon cards or rows, topic tags, member/online counts, join | `KitCard`, `KitRow`, `KitPhoto`, `KitTrack`, `KitChip`, `KitTrail`, `KitText`, `KitAction` | None |
| 4 | social | StoryViewer | Segmented slide progress bars, full photo, sticker pill, quick-reply bar | `KitCard`, `KitStepsTrack`, `KitPhoto`, `KitRow`, `KitInput`, `KitText`, `KitAction` | None |
| 4 | social | FollowList | Account rows with avatar, handle, verified badge, bio/mutuals, follow toggle | `KitCard`, `KitRow`, `KitPhoto`, `KitIcon`, `KitText`, `KitAction` | None |
| 4 | social | LiveRoom | Speaker tile grid with active-talker rings, listener count, raise-hand bar | `KitCard`, `KitGrid`, `KitPhoto`, `KitTrail`, `KitText`, `KitAction` | None |
| 4 | media | Article | Paragraphs, headings, lists, emphasis, links | `KitCard`, `KitContent`, `KitRow`, `KitIcon`, `KitPhoto`, `KitText` | None |
| 4 | media | Library | Cover grid, progress, new badges | `KitCard`, `KitGrid`, `KitRow`, `KitPhoto`, `KitText`, `KitMeter`, `KitTrail` | None |
| 4 | media | Collection | Large artwork, title, summary, play/follow | `KitCard`, `KitPhoto`, `KitContent`, `KitText`, `KitAction` | None |
| 4 | media | Playlist | Number/artwork rows, played bar, download | `KitCard`, `KitRow`, `KitRank`, `KitPhoto`, `KitText`, `KitMeter`, `KitIcon`, `KitAction` | None |
| 4 | media | ChapterList | Timestamp rail, current chapter, seek links | `KitCard`, `KitRow`, `KitTime`, `KitText`, `KitTrail` | None |
| 4 | media | MiniPlayer | Slim bottom artwork/title, progress, play/pause | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitMeter`, `KitAction` | None |
| 4 | media | Highlights | Quote/time cards, source, note, source link | `KitCard`, `KitRow`, `KitContent`, `KitText`, `KitTime` | None |
| 4 | media | Transcript | Time-synced scrolling lyric/transcript lines, active highlight, save line | `KitCard`, `KitScroll`, `KitRow`, `KitTime`, `KitText`, `KitAction` | None |
| 4 | media | AudioMatch | Listen trigger tile, matched track artwork card, recent match rows | `KitCard`, `KitTile`, `KitPhoto`, `KitRow`, `KitText`, `KitAction` | None |
| 4 | events | GuestList | Party groups, RSVP pills, diets, status counts | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitGrid`, `KitAction` | None |
| 4 | events | RSVP | Yes/no controls, plus, meal, note, send | `KitCard`, `KitContent`, `KitText`, `KitAction`, `KitInput`, `KitTrack`, `KitChip` | None |
| 4 | events | Seating | Round/long tables, initials, unseated tray | `KitCard`, `KitText`, `KitRow`, `KitChip` | `KitSeatMap` |
| 4 | events | Vendors | Supplier icons, money/due rows, call, totals | `KitCard`, `KitRow`, `KitGrid`, `KitIcon`, `KitText`, `KitAction` | None |
| 4 | events | Ticket | Perforated admission pass, holder, code | `KitContent`, `KitText`, `KitRow` | `KitTicket`, `KitCode` |
| 4 | events | Door | Scan frame, arrivals headline, manual check-in | `KitCard`, `KitViewfinder`, `KitText`, `KitInput`, `KitRow`, `KitAction` | None |
| 4 | events | Registry | Gift photo rows, claimed marks, claim/release | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitAction`, `KitTrail` | None |
| 4 | events | FindDate | Sticky people, date columns, response cells | `KitCard`, `KitText`, `KitChip` | `KitTable` |
| 4 | events | Sessions | Track filter chips, timed session rows, bookmark toggles | `KitCard`, `KitTrack`, `KitChip`, `KitRow`, `KitTime`, `KitText`, `KitTrail`, `KitAction` | None |
| 4 | places | PlaceCard | Photo summary, rating, distance, open mark | `KitCard`, `KitContent`, `KitPhoto`, `KitText`, `KitScaleTrack`, `KitTrail` | None |
| 4 | places | Address | Address lines, small map, contact actions | `KitCard`, `KitContent`, `KitText`, `KitMapTile`, `KitAction` | None |
| 4 | places | Hours | Seven day/time rows, today, special notices | `KitCard`, `KitRow`, `KitTime`, `KitText`, `KitTrail` | None |
| 4 | places | DeliveryTracker | Courier/destination map, ETA, step, call | `KitCard`, `KitMapTile`, `KitContent`, `KitText`, `KitPhoto`, `KitAction` | None |
| 4 | places | MapList | Selectable pins, linked highlighted rows, view | `KitCard`, `KitMapTile`, `KitRow`, `KitText`, `KitTrack`, `KitChip` | None |
| 4 | places | Departures | Line badges, destination, live/delayed times | `KitCard`, `KitRow`, `KitTrail`, `KitText` | None |
| 4 | places | StationRates | Fuel price or EV stall rows, distance badge, cashback offer card | `KitCard`, `KitRow`, `KitTrail`, `KitText`, `KitAction` | None |
| 4 | community | Members | Register rows, portraits, eligibility/dues badges | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail`, `KitAction` | None |
| 4 | community | Dues | Assessment/receipt ledger, totals, pay/void | `KitCard`, `KitRow`, `KitGrid`, `KitText`, `KitTrail`, `KitAction` | None |
| 4 | community | Vote | Ballot choices, quorum bar, aggregate decision | `KitCard`, `KitText`, `KitTrack`, `KitChip`, `KitMeter`, `KitRow`, `KitAction` | None |
| 4 | community | SignUpSheet | Counted slots, claimant rows, compact expansion | `KitCard`, `KitRow`, `KitText`, `KitAvatarStack`, `KitAction` | None |
| 4 | community | Minutes | Decision document, linked actions, checks | `KitCard`, `KitContent`, `KitRow`, `KitText`, `KitCheck`, `KitAction` | None |
| 4 | community | ModQueue | Screening/flagged cards, rule chips, approve/decline/remove | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTrack`, `KitChip`, `KitAction` | None |

### Wave 5

| Wave | Pack | Component | Drawing needs | Existing bases | New bases |
| --- | --- | --- | --- | --- | --- |
| 5 | inventory | Things | Photo grid/rows, stock mark, quantity controls | `KitCard`, `KitGrid`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | inventory | Storage | Breadcrumbs, spot icons/counts, contents | `KitCard`, `KitTrack`, `KitChip`, `KitRow`, `KitIcon`, `KitText` | None |
| 5 | inventory | Loans | Thing/photo rows, due warning, return/remind | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | inventory | Warranties | Receipt thumbnails, purchase/expiry rows | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail` | None |
| 5 | inventory | Wishlist | Photo rows, price/target, priority, got | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | inventory | Listing | Price, icon facts, address, save/contact | `KitCard`, `KitContent`, `KitGrid`, `KitRow`, `KitIcon`, `KitText`, `KitAction` | None |
| 5 | inventory | Request | Repair summary, priority/status, update field | `KitCard`, `KitContent`, `KitPhoto`, `KitText`, `KitTrack`, `KitChip`, `KitRow`, `KitInput` | None |
| 5 | inventory | Lease | Terms, rent/deposit, time-left bar, renewal | `KitCard`, `KitContent`, `KitRow`, `KitText`, `KitMeter`, `KitTrail` | None |
| 5 | data | Table | Sticky label column, sort, status, row checks | `KitCard`, `KitText`, `KitTrail`, `KitCheck` | `KitTable` |
| 5 | data | Board | Counted stage columns, cards, value totals | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitPhoto` | `KitColumns` |
| 5 | data | FilterBar | Search, bounded filter pickers, sort, clear | `KitCard`, `KitInput`, `KitText`, `KitTrack`, `KitChip`, `KitOption`, `KitAction` | `KitScroll` |
| 5 | data | LineChart | Labelled axes, multi-series lines, selected point | `KitCard`, `KitText`, `KitRow` | `KitLinePlot` |
| 5 | data | Heatmap | Week/day or day/hour cells, intensity legend | `KitCard`, `KitText` | `KitHeatGrid` |
| 5 | data | BulkActions | Bottom selected count, all, danger actions | `KitCard`, `KitBlock`, `KitText`, `KitTrack`, `KitAction` | None |
| 5 | data | ActivityLog | Portrait audit rows, sentence, timestamp | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTime` | None |
| 5 | data | Funnel | Ordered stage bars, counts, computed conversion labels | `KitCard`, `KitRow`, `KitMeter`, `KitText`, `KitTrail` | None |
| 5 | data | SavedViews | Named preset chips/rows, computed counts, save/remove | `KitCard`, `KitTrack`, `KitChip`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | team | Roster | People by days, shift cells, cover marks | `KitCard`, `KitText`, `KitPhoto` | `KitTable`, `KitWeekMatrix` |
| 5 | team | Shift | Date/time card, role/place, offer/swap | `KitCard`, `KitContent`, `KitText`, `KitAction` | None |
| 5 | team | OpenShift | Open shift rows, time/pay, claim | `KitCard`, `KitRow`, `KitText`, `KitAction` | None |
| 5 | team | TimeClock | Work clock, large in/out, break controls | `KitCard`, `KitContent`, `KitText`, `KitAction`, `KitRow` | None |
| 5 | team | Timesheet | Person/day hours table, total, overtime, approve | `KitCard`, `KitText`, `KitAction` | `KitTable`, `KitWeekMatrix` |
| 5 | team | Approval | Request portraits/details, approve/decline | `KitCard`, `KitRow`, `KitPhoto`, `KitContent`, `KitText`, `KitAction` | None |
| 5 | team | Handover | Shift note rows, flags, seen ticks | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitCheck` | None |
| 5 | team | LeaveBalance | PTO type rows, accrued/used/pending/available meters, request button | `KitCard`, `KitRow`, `KitMeter`, `KitGrid`, `KitText`, `KitAction` | None |
| 5 | team | PayStub | Pay period header, net pay headline, earnings/deductions rows, export | `KitCard`, `KitGrid`, `KitRow`, `KitText`, `KitAction` | None |
| 5 | team | TeamDirectory | Search box, department groups, avatars, availability badges, call/chat | `KitCard`, `KitInput`, `KitRow`, `KitPhoto`, `KitTrail`, `KitText`, `KitAction` | None |
| 5 | team | TeamNotice | Pinned notice body, urgency tone, read-acknowledgment tick, read count | `KitCard`, `KitRow`, `KitCheck`, `KitTrail`, `KitText`, `KitAction` | None |
| 5 | sports | Fixtures | Match rows/next card, initials, result pill | `KitCard`, `KitRow`, `KitContent`, `KitPhoto`, `KitText`, `KitTime`, `KitTrail` | None |
| 5 | sports | Scoreboard | Two large scores, central status/clock, keeper | `KitCard`, `KitText`, `KitAction` | `KitScore` |
| 5 | sports | Standings | Sticky teams, numeric columns, form, cut lines | `KitCard`, `KitText`, `KitRank`, `KitTrail`, `KitTrack`, `KitChip` | `KitTable` |
| 5 | sports | Lineup | Pitch lines, numbered player nodes, substitutes | `KitCard`, `KitRow`, `KitText`, `KitStrip` | `KitPitch` |
| 5 | sports | MatchFeed | Home/away events, central minute, kind icons | `KitCard`, `KitRow`, `KitGrid`, `KitTime`, `KitIcon`, `KitText`, `KitAction` | None |
| 5 | sports | Squad | Portrait rows, availability choice, coach tick | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTrack`, `KitChip`, `KitCheck`, `KitMeter` | None |
| 5 | sports | Bracket | Sideways rounds, paired ties, winner links | `KitCard`, `KitText`, `KitRow` | `KitBracket` |
| 5 | sports | MatchStats | Period chips, center-mirrored two-team horizontal comparison meters | `KitCard`, `KitTrack`, `KitChip`, `KitRow`, `KitMeter`, `KitText` | None |
| 5 | sports | BoxScore | Period line score, team selector, sticky player stat table | `KitCard`, `KitTrack`, `KitChip`, `KitTable`, `KitText` | None |
| 5 | sports | MomentumChart | Centered-baseline win-probability/momentum line plot with event points | `KitCard`, `KitLinePlot`, `KitRow`, `KitText` | None |
| 5 | projects | Tasks | Grouped task rows, indented children, blockers | `KitCard`, `KitRow`, `KitText`, `KitCheck`, `KitTrack`, `KitChip` | None |
| 5 | projects | Milestones | Dated gate rail/cards, missing deliverables | `KitCard`, `KitRouteStop`, `KitRow`, `KitTime`, `KitText`, `KitTrail` | None |
| 5 | projects | Gantt | Sticky task rail, date bars, diamonds, links | `KitCard`, `KitText`, `KitTrack`, `KitChip` | `KitGantt` |
| 5 | projects | TimeLog | Day groups, durations/totals, timer, remove | `KitCard`, `KitRow`, `KitTime`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | projects | Scope | Acceptance document, checks, excluded section | `KitCard`, `KitContent`, `KitRow`, `KitText`, `KitCheck`, `KitAction` | None |
| 5 | projects | ProjectStatus | RAG status pill, headline, wins/blockers lists, next milestone link | `KitCard`, `KitRow`, `KitTrail`, `KitTime`, `KitText`, `KitAction` | None |
| 5 | projects | ProjectBrief | Charter objective, owner/window facts, summary sections, resource links | `KitCard`, `KitContent`, `KitRow`, `KitIcon`, `KitText`, `KitAction` | None |
| 5 | paperwork | Documents | Neutral file tiles/rows, masked id, expiry | `KitCard`, `KitRow`, `KitIcon`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | paperwork | Renewals | Notice/due rows/cards, completed ticks, reminder | `KitCard`, `KitRow`, `KitText`, `KitCheck`, `KitTrail`, `KitAction` | None |
| 5 | paperwork | Receipts | Neutral attachment tiles, amounts, review ticks | `KitCard`, `KitRow`, `KitIcon`, `KitText`, `KitCheck`, `KitAction` | None |
| 5 | paperwork | Signature | Private drawn mark, review, clear/save | `KitCard`, `KitText`, `KitCheck`, `KitAction` | `KitSignaturePad` |
| 5 | paperwork | TaxYear | Evidence category rows, progress, missing files | `KitCard`, `KitRow`, `KitText`, `KitMeter`, `KitTrail` | None |
| 5 | paperwork | ScanBatch | Ordered page thumbnail tray, page count, move/retake/remove, save PDF | `KitCard`, `KitStrip`, `KitGrid`, `KitPhoto`, `KitText`, `KitAction` | None |
| 5 | paperwork | FormFiller | Completion meter, document preview link, named field inputs, save copy | `KitCard`, `KitMeter`, `KitRow`, `KitInput`, `KitCheck`, `KitText`, `KitAction` | None |
| 5 | books | Ledger | Account groups, in/out lines, sources, export | `KitCard`, `KitRow`, `KitGrid`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | books | Expenses | Receipt/line document, coding/value controls | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitInput`, `KitTrack`, `KitChip`, `KitAction` | None |
| 5 | books | ProfitLoss | Statement sections, subtotal rows, tax bridge | `KitCard`, `KitContent`, `KitRow`, `KitGrid`, `KitText` | None |
| 5 | books | VatReturn | Nine numbered boxes, reconciliation, save | `KitCard`, `KitGrid`, `KitRow`, `KitRank`, `KitText`, `KitAction` | None |
| 5 | books | Payroll | Pay-run/payslip rows, deductions, totals/actions | `KitCard`, `KitContent`, `KitRow`, `KitGrid`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | books | Reconcile | Statement/ledger match rows, category chips, rule/sync | `KitCard`, `KitRow`, `KitPhoto`, `KitTrack`, `KitChip`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | books | MileageLog | Trip rows, business/personal chips, odometer/GPS controls | `KitCard`, `KitRow`, `KitInput`, `KitTrack`, `KitChip`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | books | CashForecast | Horizon tabs, balance projection line, cash event rows | `KitCard`, `KitTrack`, `KitChip`, `KitLinePlot`, `KitRow`, `KitText`, `KitTrail` | None |
| 5 | invest | Holdings | Position rows, cost/value/gain, dated quotes | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | invest | Watchlist | Quote/target rows, signed gaps, remove/refresh | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | invest | Performance | Value/contribution lines, legend, point reading | `KitCard`, `KitText`, `KitTrack`, `KitChip`, `KitRow` | `KitLinePlot` |
| 5 | invest | Dividends | Dated distributions, expected/received, receive/void | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | invest | InvestmentActivity | Dated trade/cash ledger, amounts, source/void | `KitCard`, `KitRow`, `KitGrid`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | invest | TradeTicket | Order kind/side chips, amount/price fields, estimate, place | `KitCard`, `KitTrack`, `KitChip`, `KitInput`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | invest | Rebalance | Target vs actual meters, target inputs, drift/trade rows | `KitCard`, `KitRow`, `KitMeter`, `KitInput`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | hiring | JobPost | Role/pay terms, requirements, deadline, actions | `KitCard`, `KitContent`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | hiring | ApplicantPipeline | Stage columns or stack, counts, applicant cards | `KitCard`, `KitRow`, `KitText`, `KitTrail` | `KitColumns` |
| 5 | hiring | Candidate | Portrait, criterion choices, evidence, decisions | `KitCard`, `KitPhoto`, `KitContent`, `KitRow`, `KitText`, `KitTrack`, `KitChip`, `KitInput`, `KitAction` | None |
| 5 | hiring | Interview | Meeting card/summary, people, time, join/invite | `KitCard`, `KitContent`, `KitRow`, `KitText`, `KitAvatarStack`, `KitAction` | None |
| 5 | hiring | Offer | Letter/card terms, conditions, response actions | `KitCard`, `KitContent`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | hiring | Applications | Application rows/cards, next action, follow-up | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitCheck`, `KitAction` | None |
| 5 | hiring | JobFeed | Opening rows/cards, workplace/easy-apply pills, save/apply | `KitCard`, `KitRow`, `KitTrack`, `KitChip`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | hiring | ResumeProfile | CV summary card, experience/education rows, skill chips | `KitCard`, `KitContent`, `KitRow`, `KitTrack`, `KitChip`, `KitText`, `KitTrail`, `KitAction` | None |

### Wave 6

| Wave | Pack | Component | Drawing needs | Existing bases | New bases |
| --- | --- | --- | --- | --- | --- |
| 6 | comms | Inbox | Pinned/unread thread rows, online/typing dots, delivery ticks, badges, triage actions | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTime`, `KitTrail`, `KitAction` | None |
| 6 | comms | MailThread | Collapsible email cards, sender/recipient headers, attachment chips, reply/forward bar | `KitCard`, `KitRow`, `KitContent`, `KitText`, `KitTime`, `KitChip`, `KitAction` | None |
| 6 | comms | ChannelSpace | Server banner, collapsible channel categories, unread/mention pills, voice room stacks | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitIcon`, `KitTrail`, `KitAvatarStack`, `KitAction` | None |
| 6 | comms | ChannelFeed | Multi-author stream, role tags, file chips, reaction pills, thread count link | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTime`, `KitTrack`, `KitChip`, `KitAction` | None |
| 6 | comms | ActiveCall | Pre-join lobby preview or participant tiles, call timer, A/V toggles, end call | `KitCard`, `KitGrid`, `KitTile`, `KitPhoto`, `KitText`, `KitTime`, `KitAction` | None |
| 6 | comms | MeetingRecap | Recording link card, decisions, speaker highlights, owner action checks | `KitCard`, `KitContent`, `KitRow`, `KitText`, `KitCheck`, `KitTrail`, `KitAction` | None |
| 6 | comms | Dialer | Formatted number readout, matched-contact banner, T9 keypad, call/SMS triggers | `KitCard`, `KitText`, `KitRow`, `KitPhoto`, `KitNumberPad`, `KitAction` | None |
| 6 | comms | CallLog | Call/voicemail rows, direction/spam tags, transcript snippet, callback/play | `KitCard`, `KitRow`, `KitIcon`, `KitText`, `KitTime`, `KitTrail`, `KitPlayback`, `KitAction` | None |
| 6 | comms | Contacts | Alphabetical directory rows, verified/blocked marks, chat/call/invite actions | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | assistant | AiThread | Multi-turn prose/lists, inline citation pills, streaming cursor, turn feedback/TTS | `KitCard`, `KitContent`, `KitRow`, `KitText`, `KitChip`, `KitPlayback`, `KitAction` | `KitCodeBlock` |
| 6 | assistant | PromptComposer | Multiline prompt dock, mode selector pill, file/photo/mic triggers, send/stop | `KitCard`, `KitTextArea`, `KitTrack`, `KitChip`, `KitAction` | `KitMicCapture` |
| 6 | assistant | PromptStarters | Category-tagged starter prompt cards or compact rows on blank screen | `KitCard`, `KitGrid`, `KitRow`, `KitIcon`, `KitText`, `KitTrack`, `KitChip`, `KitAction` | None |
| 6 | assistant | CitationCards | Sideways source rail or list with domain icon, snippet, date, follow-up chips | `KitCard`, `KitStrip`, `KitRow`, `KitIcon`, `KitText`, `KitTrack`, `KitChip`, `KitAction` | None |
| 6 | assistant | ToolStep | Expandable connector trace rows, running/done/error marks, output summary | `KitCard`, `KitRow`, `KitIcon`, `KitText`, `KitTrail`, `KitContent`, `KitAction` | None |
| 6 | assistant | ArtifactCard | Deliverable preview/expanded frame, kind/version badges, copy/export/refine | `KitCard`, `KitContent`, `KitText`, `KitTrail`, `KitChip`, `KitAction` | `KitCodeBlock` |
| 6 | assistant | VoiceOrb | Radial state indicator, live rolling transcript caption, mute/camera/end controls | `KitCard`, `KitContent`, `KitText`, `KitAction` | `KitVoiceOrb` |
| 6 | assistant | ChatArchive | Date-bucketed thread rows, project/model pills, pin/rename/delete actions | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitTime`, `KitAction` | None |
| 6 | workspace | DriveTree | Breadcrumb trail, folder/file rows or 2-col cards, shared/pin marks, upload/new | `KitCard`, `KitStrip`, `KitGrid`, `KitRow`, `KitIcon`, `KitPhoto`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | workspace | CloudQuota | Multi-service stacked allocation bar, breakdown rows, cleanup/upgrade links | `KitCard`, `KitShare`, `KitRow`, `KitIcon`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | workspace | ShareAccess | Link-visibility selector, collaborator rows with role pickers, invite, copy link | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitOption`, `KitChip`, `KitInput`, `KitAction` | None |
| 6 | workspace | QuickNotes | Two-column toned note cards or list, inline checks, label pills, pin/archive | `KitCard`, `KitGrid`, `KitRow`, `KitText`, `KitCheck`, `KitTrack`, `KitChip`, `KitAction` | None |
| 6 | workspace | DocPage | Page icon/title, property grid, collapsible toggle blocks, subpage/comment links | `KitCard`, `KitContent`, `KitGrid`, `KitRow`, `KitIcon`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | workspace | DocComments | Quoted anchor excerpt, author/time, diff badge, resolve/accept/reply controls | `KitCard`, `KitContent`, `KitRow`, `KitPhoto`, `KitText`, `KitTime`, `KitTrail`, `KitAction` | None |
| 6 | workspace | VersionHistory | Named revision timeline rows, editor avatar, change summary, preview/restore | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTime`, `KitTrail`, `KitAction` | None |
| 6 | utilities | Calculator | Multi-line expression/result readout, scrollable tape, angle pill, keypad | `KitCard`, `KitScroll`, `KitRow`, `KitText`, `KitChip`, `KitAction` | `KitCalcPad` |
| 6 | utilities | UnitConverter | Category chips, paired unit pickers/inputs, swap, live multi-unit reference list | `KitCard`, `KitTrack`, `KitChip`, `KitRow`, `KitInput`, `KitText`, `KitAction` | None |
| 6 | utilities | Translator | Language pickers, swap, split source/translated panes, transliteration, TTS/copy | `KitCard`, `KitTextArea`, `KitContent`, `KitText`, `KitChip`, `KitPlayback`, `KitAction` | `KitMicCapture` |
| 6 | utilities | QrStudio | Payload kind chips, input field, QR matrix, decoded smart-action/history rows | `KitCard`, `KitCode`, `KitTrack`, `KitChip`, `KitInput`, `KitRow`, `KitText`, `KitAction` | None |
| 6 | utilities | SpeedGauge | Radial speed readout, phase pill, ping/jitter/loss metrics, server picker, start | `KitCard`, `KitGrid`, `KitRow`, `KitText`, `KitTrail`, `KitOption`, `KitAction` | `KitDialGauge` |
| 6 | utilities | FileBrowser | Path breadcrumbs, category filters, file rows/cards, Safe Folder lock, actions | `KitCard`, `KitStrip`, `KitGrid`, `KitRow`, `KitIcon`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | security | AuthTokens | Issuer icon, account, spaced 6/8-digit code, 30s radial ring, mask/copy | `KitCard`, `KitRow`, `KitIcon`, `KitText`, `KitRadialTrack`, `KitTrail`, `KitAction` | None |
| 6 | security | PushChallenge | App/location/device facts, 2-digit number-match tiles, approve/deny controls | `KitCard`, `KitContent`, `KitRow`, `KitGrid`, `KitOption`, `KitText`, `KitAction` | None |
| 6 | security | CredentialVault | Locked PIN/biometric gate, searchable vault rows, breach/2FA marks, reveal/copy | `KitCard`, `KitRow`, `KitIcon`, `KitText`, `KitTrail`, `KitNumberPad`, `KitAction` | None |
| 6 | security | PasswordGen | Tinted generated secret, entropy meter, length slider, charset toggles, copy | `KitCard`, `KitText`, `KitMeter`, `KitSlider`, `KitRow`, `KitCheck`, `KitChip`, `KitAction` | None |
| 6 | security | RecoveryCodes | Grid/list of masked one-time codes, used ticks, reveal, copy, regenerate | `KitCard`, `KitGrid`, `KitRow`, `KitText`, `KitCheck`, `KitAction` | None |
| 6 | security | VpnTunnel | Protection banner, shield connect toggle, server picker, protocol toggles, sparkline | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitOption`, `KitSpark`, `KitAction` | None |
| 6 | security | SecurityAudit | Computed hygiene score, category counters, tappable remediation issue rows | `KitCard`, `KitRing`, `KitGrid`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | security | DeviceTrust | Compliance posture summary, OS/MDM check rows, fix links, unenroll action | `KitCard`, `KitContent`, `KitRow`, `KitIcon`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | auto | Garage | Multi-vehicle card strip or rows, masked VIN, odometer, powertrain/due pills | `KitCard`, `KitStrip`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | auto | VehicleControl | SoC/fuel meter, charge-limit slider, four-corner tire grid, remote toggles | `KitCard`, `KitContent`, `KitGrid`, `KitRow`, `KitMeter`, `KitSlider`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | auto | ServiceLog | Dual-interval maintenance rows, due meters, receipt thumbnails, done button | `KitCard`, `KitRow`, `KitMeter`, `KitPhoto`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | auto | Diagnostics | Fault code rows, severity pills, repair cost range, recall rows, scan/clear | `KitCard`, `KitContent`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | auto | FuelLog | Economy trend plot, average stats, dated odometer/fill-up ledger rows | `KitCard`, `KitLinePlot`, `KitGrid`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | auto | ChargePump | Station rows with connector chips and open stalls, live pump/charge session | `KitCard`, `KitContent`, `KitGrid`, `KitRow`, `KitChip`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | auto | ParkingMeter | Zone/plate selector, duration stepper, active countdown, extend, gate QR pass | `KitCard`, `KitContent`, `KitRow`, `KitChip`, `KitTime`, `KitCode`, `KitText`, `KitAction` | None |
| 6 | auto | VehicleListing | Asking price, deal rating badge, icon spec grid, title pills, save/contact | `KitCard`, `KitContent`, `KitPhoto`, `KitGrid`, `KitChip`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | auto | VinReport | Provenance check grid, valuation range band, dated registration/service events | `KitCard`, `KitContent`, `KitGrid`, `KitRow`, `KitRangeBand`, `KitTime`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | medical | LabPanel | Panel header, analyte rows with value/reference band, flags, clinician note | `KitCard`, `KitContent`, `KitRow`, `KitRangeBand`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | medical | Prescription | Rx cards or detail, masked Rx#, four-step fulfillment track, refill/transfer | `KitCard`, `KitRow`, `KitStepsTrack`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | medical | InsuranceBenefits | In/out-of-network deductible and OOP meters, EOB claim rows, status pills | `KitCard`, `KitContent`, `KitGrid`, `KitRow`, `KitMeter`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | medical | TelehealthVisit | Pre-visit checks, mic/cam readiness toggles, queue ETA, join/AVS view | `KitCard`, `KitContent`, `KitRow`, `KitCheck`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | medical | CareSummary | Grouped condition, allergy severity, immunization, and care-team contact rows | `KitCard`, `KitContent`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | medical | ClinicalIntake | Complaint input, red-flag checks, scored screening choices, optional photo | `KitCard`, `KitRow`, `KitInput`, `KitCheck`, `KitOption`, `KitPhoto`, `KitText`, `KitAction` | None |
| 6 | medical | RxCompare | Form/quantity chips, sorted pharmacy coupon vs copay rows, coupon link | `KitCard`, `KitRow`, `KitTrack`, `KitChip`, `KitGrid`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | medical | TherapyMonitor | Nightly score or time-in-range band, indices, trend plot, supply alerts | `KitCard`, `KitContent`, `KitGrid`, `KitRow`, `KitRangeBand`, `KitLinePlot`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | weather | WeatherHero | City header, large live temp, condition icon, feels-like, H/L, precip ETA | `KitCard`, `KitContent`, `KitGrid`, `KitIcon`, `KitText`, `KitAction` | None |
| 6 | weather | HourlyForecast | Sideways hourly strip, temp/precip line plot, or 60-min rain intensity bars | `KitCard`, `KitStrip`, `KitLinePlot`, `KitBars`, `KitIcon`, `KitText`, `KitAction` | None |
| 6 | weather | DailyForecast | 7–14 day rows with weekly-aligned min/max range bars and day/night split | `KitCard`, `KitRow`, `KitRangeBand`, `KitIcon`, `KitText`, `KitTrail` | None |
| 6 | weather | RadarMap | Stepped radar map tile, timeline slider, layer pills, play/pause toggle | `KitCard`, `KitMapTile`, `KitSlider`, `KitTrack`, `KitChip`, `KitText`, `KitAction` | None |
| 6 | weather | AirQuality | AQI health range band, pollutant tiles, wind/dew-point/pressure/visibility | `KitCard`, `KitContent`, `KitGrid`, `KitRangeBand`, `KitRow`, `KitText`, `KitTrail` | None |
| 6 | weather | SevereAlert | Severity-coded storm/hazard card, active time window, expandable guidance | `KitCard`, `KitContent`, `KitRow`, `KitIcon`, `KitTime`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | weather | UvPollen | UV exposure range band, peak sun window, tree/grass/weed/mold pollen meters | `KitCard`, `KitContent`, `KitGrid`, `KitRangeBand`, `KitMeter`, `KitText`, `KitAction` | None |
| 6 | weather | AstroSun | Semicircular horizon solar progress arc, twilight times, moon phase readout | `KitCard`, `KitContent`, `KitRadialTrack`, `KitGrid`, `KitTime`, `KitText` | None |
| 6 | realestate | PropertySearch | Price-pin map tile synced with swipeable/scrollable home cards, save toggle | `KitCard`, `KitMapTile`, `KitPhoto`, `KitStrip`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | realestate | HomeListing | Asking price/rent, monthly preview, bed/bath/sqft grid, HOA/tax, actions | `KitCard`, `KitContent`, `KitGrid`, `KitIcon`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | realestate | MortgageCalc | Stacked PITI share bar, monthly breakdown rows, price/down/rate sliders | `KitCard`, `KitContent`, `KitShare`, `KitRow`, `KitSlider`, `KitInput`, `KitTrack`, `KitChip`, `KitText` | None |
| 6 | realestate | SavedSearches | Saved search summary rows, match badges, cadence chips, mute/delete controls | `KitCard`, `KitRow`, `KitTrack`, `KitChip`, `KitTrail`, `KitText`, `KitAction` | None |
| 6 | realestate | TourBooking | Tour mode chips, date selector, time slot grid, agent note, submit/cancel | `KitCard`, `KitContent`, `KitSlotGrid`, `KitTrack`, `KitChip`, `KitInput`, `KitText`, `KitAction` | None |
| 6 | realestate | HomeCompare | Sticky attribute column, 2–4 home comparison columns, differences toggle | `KitCard`, `KitTable`, `KitPhoto`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | realestate | ValueHistory | Valuation trend line with confidence band, dated sales and tax history rows | `KitCard`, `KitLinePlot`, `KitRangeBand`, `KitRow`, `KitTrack`, `KitChip`, `KitText` | None |
| 6 | parenting | PregnancyWeek | Gestational week+day header, trimester meter, size comparison, milestones | `KitCard`, `KitContent`, `KitMeter`, `KitGrid`, `KitRow`, `KitText`, `KitAction` | None |
| 6 | parenting | ContractionTimer | Start/stop contraction timer, 1h averages, 5-1-1 banner, interval log rows | `KitCard`, `KitContent`, `KitGrid`, `KitRow`, `KitTime`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | parenting | KickCounter | Ten-kick ring progress, tap-to-count control, elapsed clock, session history | `KitCard`, `KitContent`, `KitRing`, `KitRow`, `KitTime`, `KitText`, `KitAction` | None |
| 6 | parenting | GrowthChart | Pediatric weight/height/head curve over percentile bands, metric chips | `KitCard`, `KitLinePlot`, `KitTrack`, `KitChip`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | parenting | CustodyCalendar | Parent-coded month rotation day cells, handoffs, swap approve/decline card | `KitCard`, `KitGrid`, `KitDayMark`, `KitRow`, `KitTime`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | parenting | ExpenseClaim | Net co-parent balance, receipt thumbnail rows, split %, approve/reimburse | `KitCard`, `KitRow`, `KitPhoto`, `KitGrid`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | parenting | ScreenLimits | Daily quota meter, pause-all/+15m buttons, bedtime window, app switches | `KitCard`, `KitContent`, `KitMeter`, `KitRow`, `KitTime`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | parenting | MemoryAlbum | Child switcher chips, age-grouped photo/video cards or grid, comments | `KitCard`, `KitGrid`, `KitPhoto`, `KitContent`, `KitRow`, `KitTrack`, `KitChip`, `KitText`, `KitAction` | None |
| 6 | ticketing | EventDiscovery | Date block, photo cards/rows, price, low stock, save | `KitCard`, `KitPhoto`, `KitDay`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | ticketing | PriceTiers | Venue zone swatches, counts, price ranges, filter | `KitCard`, `KitRow`, `KitChip`, `KitTrail`, `KitText`, `KitAction` | None |
| 6 | ticketing | SeatListings | Section/row rows, deal score pill, view thumb, all-in toggle | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | ticketing | TicketWallet | Perforated event pass, gate/seat, rotating QR, transfer/sell | `KitTicket`, `KitCode`, `KitCard`, `KitRow`, `KitText`, `KitAction` | None |
| 6 | ticketing | ResaleListing | Seat summary, market floor, ask price input, payout breakdown | `KitCard`, `KitContent`, `KitInput`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | ticketing | VenueGuide | Door/show times, policy pills, transit notes, seat-view strip | `KitCard`, `KitContent`, `KitTime`, `KitTrack`, `KitChip`, `KitStrip`, `KitPhoto`, `KitText`, `KitAction` | None |
| 6 | dating | MatchDeck | Swipe/prompt cards, photo dots, prompt likes, deck actions | `KitSwipeStack`, `KitCard`, `KitPhoto`, `KitContent`, `KitTrack`, `KitChip`, `KitText`, `KitAction` | None |
| 6 | dating | LikesGrid | Two-column blurred/clear portraits, online dot, react, reveal | `KitCard`, `KitGrid`, `KitPhoto`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | dating | MatchQueue | 24h expiry-ring avatar rail, turn-flagged match threads | `KitCard`, `KitStrip`, `KitRow`, `KitPhoto`, `KitRing`, `KitText`, `KitTrail` | None |
| 6 | dating | MatchReveal | Overlapping match portraits, quick opener chips, inline send | `KitCard`, `KitContent`, `KitPhoto`, `KitTrack`, `KitChip`, `KitInput`, `KitText`, `KitAction` | None |
| 6 | dating | Compatibility | Match score ring, trait bars, shared chips, dealbreaker ticks | `KitCard`, `KitRing`, `KitMeter`, `KitTrack`, `KitChip`, `KitCheck`, `KitRow`, `KitText` | None |
| 6 | dating | Icebreaker | Prompt card, quick-pick chips, custom opener, shuffle/skip | `KitCard`, `KitContent`, `KitTrack`, `KitChip`, `KitInput`, `KitText`, `KitAction` | None |
| 6 | dating | SafetyPass | Date check-in countdown, safe/alert, confirmed moderation | `KitCard`, `KitContent`, `KitRow`, `KitTime`, `KitText`, `KitCheck`, `KitAction` | None |
| 6 | comics | ComicReader | Gapless vertical strip or LTR/RTL pages, scrubber, tap HUD | `KitCard`, `KitPhoto`, `KitMeter`, `KitText`, `KitAction` | `KitPanelStrip` |
| 6 | comics | SeriesHeader | Cover art, creator, cadence, UP/completed pill, subscribe, CTA | `KitCard`, `KitPhoto`, `KitContent`, `KitTrack`, `KitChip`, `KitTrail`, `KitText`, `KitAction` | None |
| 6 | comics | EpisodeGate | Numbered thumbs, read dim, download, Free/Wait/Pass/Coin pills | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail`, `KitTime`, `KitAction` | None |
| 6 | comics | ReleaseSchedule | Mon–Sun weekday tabs, three-column cover tiles, UP/unread | `KitCard`, `KitTrack`, `KitChip`, `KitGrid`, `KitPhoto`, `KitText`, `KitTrail` | None |
| 6 | comics | ChapterWallet | Coin/pass balances, Wait-Free recharge bars, ad/top-up actions | `KitCard`, `KitContent`, `KitRow`, `KitMeter`, `KitTime`, `KitText`, `KitAction` | None |
| 6 | comics | ComicShelf | Cover grid/rows, +N unread badges, quick resume jump | `KitCard`, `KitGrid`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | watch | TitleHero | Backdrop hero, year/maturity/runtime pills, trailer, play/list | `KitCard`, `KitPhoto`, `KitContent`, `KitTrack`, `KitChip`, `KitText`, `KitAction` | None |
| 6 | watch | SeasonEpisodes | Season picker, episode thumbs, synopses, watched bars, download | `KitCard`, `KitTrack`, `KitChip`, `KitRow`, `KitPhoto`, `KitMeter`, `KitText`, `KitAction` | None |
| 6 | watch | ChannelGuide | Sticky channels across time slots, live program progress bars | `KitTable`, `KitCard`, `KitRow`, `KitPhoto`, `KitMeter`, `KitTime`, `KitText` | None |
| 6 | watch | WatchQueue | Resume rail/list, S2·E4 tags, progress bars, time left, remove | `KitCard`, `KitStrip`, `KitRow`, `KitPhoto`, `KitMeter`, `KitText`, `KitAction` | None |
| 6 | watch | RemoteControl | Device picker, circular D-pad, mic, volume/mute, transport | `KitCard`, `KitTrack`, `KitChip`, `KitGrid`, `KitIcon`, `KitText`, `KitAction` | `KitRemotePad` |
| 6 | watch | Showtimes | Theater cards, projection format filters, availability time chips | `KitSlotGrid`, `KitCard`, `KitTrack`, `KitChip`, `KitRow`, `KitText` | None |
| 6 | watch | SeatPicker | Curved screen bar, row×col auditorium grid, aisles, subtotal | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | `KitSeatGrid` |
| 6 | puzzles | WordGrid | 4×4–9×9 guess/crossword/search letter matrix, clue/word states | `KitCard`, `KitRow`, `KitTrack`, `KitChip`, `KitText`, `KitAction` | `KitCellGrid` |
| 6 | puzzles | NumberGrid | 4×4/6×6/9×9 logic grid, locked givens, pencil notes, conflicts | `KitCard`, `KitRow`, `KitTrack`, `KitChip`, `KitText`, `KitAction` | `KitCellGrid` |
| 6 | puzzles | TileMatch | 3×4/4×4 flip-pair cards or 16-word group tiers, mistake pips | `KitCard`, `KitFlip`, `KitTile`, `KitGrid`, `KitRow`, `KitText`, `KitAction` | None |
| 6 | puzzles | LetterBank | State-tinted QWERTY keys or anagram/hive wheel driving grid | `KitCard`, `KitText`, `KitAction` | `KitLetterKeys` |
| 6 | puzzles | QuizShow | 4-option solo trivia, combo meter, 50:50/Hint lifelines, factoid | `KitCard`, `KitContent`, `KitOption`, `KitMeter`, `KitTrack`, `KitChip`, `KitText`, `KitAction` | None |
| 6 | puzzles | PuzzleStats | Played/win%/streak KPIs, 1–6 guess histogram, emoji share copy | `KitCard`, `KitGrid`, `KitMeter`, `KitRow`, `KitText`, `KitAction` | None |
| 6 | navigation | TurnGuidance | Maneuver banner, lane pills, speed/limit, ETA footer | `KitCard`, `KitIcon`, `KitText`, `KitRow`, `KitGrid`, `KitChip`, `KitTrail`, `KitAction` | None |
| 6 | navigation | RouteOptions | Mode tabs, mini route preview, duration/tag rows | `KitCard`, `KitMapTile`, `KitTrack`, `KitChip`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | navigation | ElevationProfile | Elevation line plot, climb stats, surface share bar | `KitCard`, `KitLinePlot`, `KitShare`, `KitGrid`, `KitText`, `KitRow` | None |
| 6 | navigation | RideSelector | Pickup/dropoff stops, vehicle tier rows, fare/ETA | `KitCard`, `KitRouteStop`, `KitRow`, `KitIcon`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | navigation | RideTracker | Map tile, stage steps, driver/AV plate, controls | `KitCard`, `KitMapTile`, `KitStepsTrack`, `KitPhoto`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | navigation | TrafficReport | Alert confirm prompt, 6-tile hazard grid, side | `KitCard`, `KitGrid`, `KitTile`, `KitIcon`, `KitText`, `KitTrack`, `KitChip`, `KitAction` | None |
| 6 | navigation | TransitJourney | Walk/transit leg chain, line badges, alight alert | `KitCard`, `KitRouteStop`, `KitRow`, `KitTime`, `KitIcon`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | navigation | OfflineMaps | Storage meter, Wi-Fi switch, region download rows | `KitCard`, `KitMeter`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | stays | StayCard | Photo card, rating, capacity, nightly/total, save | `KitCard`, `KitPhoto`, `KitContent`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | stays | FareCalendar | Month grid, daily price tier cells, span summary | `KitCard`, `KitWeekGrid`, `KitDayMark`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | stays | RoomRates | Room photo/rows, bed/refund tags, rate selection | `KitCard`, `KitRow`, `KitPhoto`, `KitIcon`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | stays | AmenityGrid | Category headings, included/absent facility rows | `KitCard`, `KitGrid`, `KitRow`, `KitIcon`, `KitText`, `KitAction` | None |
| 6 | stays | StayPolicy | Check-in/out times, refund step track, rule icons | `KitCard`, `KitStepsTrack`, `KitRow`, `KitTime`, `KitIcon`, `KitText`, `KitTrail` | None |
| 6 | stays | FareAlert | Price range band, buy/wait pill, sparkline, alert | `KitCard`, `KitRangeBand`, `KitSpark`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | dining | MenuBoard | Meal sections, photo rows, calories, dietary tags | `KitCard`, `KitGrid`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | dining | DishCustomizer | Modifier groups, count steppers, half split, totals | `KitCard`, `KitRow`, `KitOption`, `KitStepper`, `KitTrack`, `KitChip`, `KitInput`, `KitText`, `KitAction` | None |
| 6 | dining | PickupCheckIn | Pickup code, channel selector, bay field, QR pass | `KitCard`, `KitCode`, `KitTrack`, `KitChip`, `KitInput`, `KitText`, `KitAction` | None |
| 6 | dining | TableBooking | Party stepper, zone chips, time slot grid, note | `KitCard`, `KitSlotGrid`, `KitStepper`, `KitTrack`, `KitChip`, `KitInput`, `KitText`, `KitAction` | None |
| 6 | dining | DiningQueue | Wait quote/party stepper or rescue bag window | `KitCard`, `KitContent`, `KitStepper`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | dining | RewardsWallet | Points balance, tier meter, challenge pills, rewards | `KitCard`, `KitMeter`, `KitRow`, `KitPhoto`, `KitChip`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | news | HeadlineRiver | Outlet badge, 100-char headline, thumb, save/share | `KitCard`, `KitRow`, `KitContent`, `KitPhoto`, `KitText`, `KitTime`, `KitTrail`, `KitAction` | None |
| 6 | news | StoryCluster | Cluster summary, 3-tone spectrum bar, outlet rows | `KitCard`, `KitShare`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | news | LiveBlog | Live header, key bullets, reverse-time dispatches | `KitCard`, `KitRow`, `KitTime`, `KitPhoto`, `KitContent`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | news | BreakingTicker | Pinned alert strip, severity pill, opt-in toggle | `KitCard`, `KitRow`, `KitIcon`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | news | EditionDigest | Numbered briefing cards, progress bar, read checks | `KitCard`, `KitRow`, `KitRank`, `KitMeter`, `KitCheck`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | news | OutletFollow | Outlet rows, follow/mute switches, notify selector | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail`, `KitChip`, `KitAction` | None |
| 6 | reference | ScriptureText | Bounded scroll chapter, verse numbers, action bar | `KitCard`, `KitScroll`, `KitContent`, `KitRow`, `KitText`, `KitChip`, `KitAction` | None |
| 6 | reference | VersePicker | Translation selector, book list, chapter/verse grid | `KitCard`, `KitGrid`, `KitRow`, `KitTrack`, `KitChip`, `KitText`, `KitAction` | None |
| 6 | reference | StudyPlan | Plan meter, day tabs, reading passage checks | `KitCard`, `KitMeter`, `KitTrack`, `KitChip`, `KitRow`, `KitCheck`, `KitText`, `KitAction` | None |
| 6 | reference | LexiconEntry | Headword, IPA audio button, POS tabs, numbered senses | `KitCard`, `KitRow`, `KitRank`, `KitTrack`, `KitChip`, `KitContent`, `KitText`, `KitAction` | None |
| 6 | reference | ParallelCompare | Side-by-side or interleaved aligned verse columns | `KitCard`, `KitGrid`, `KitRow`, `KitContent`, `KitText`, `KitChip`, `KitAction` | None |
| 6 | reference | ReferenceEntry | Summary infobox, jump TOC scroll, cited prose | `KitCard`, `KitScroll`, `KitPhoto`, `KitRow`, `KitGrid`, `KitContent`, `KitText`, `KitAction` | None |
| 6 | fantasy | FantasyMatchup | Dual scores, win-prob share bar, paired starter rows | `KitCard`, `KitScore`, `KitShare`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | fantasy | FantasyRoster | Starter/bench/IR table, injury pills, slot swap | `KitCard`, `KitTable`, `KitRow`, `KitText`, `KitTrail`, `KitChip`, `KitAction` | None |
| 6 | fantasy | DraftBoard | Rounds-by-teams draft matrix, pick clock, queue | `KitCard`, `KitTable`, `KitRow`, `KitTime`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | fantasy | WaiverWire | Position chips, 4-week bars, FAAB bid, drop select | `KitCard`, `KitRow`, `KitBars`, `KitTrack`, `KitChip`, `KitInput`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | fantasy | PropPickCard | Portrait, stat line, 5-game hit bars, More/Less | `KitCard`, `KitPhoto`, `KitBars`, `KitRow`, `KitTrack`, `KitChip`, `KitText`, `KitAction` | None |
| 6 | fantasy | OddsBoard | Sticky matchup lines table, Spread/ML/Total cells | `KitCard`, `KitTable`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | fantasy | PickSlip | Collapsible leg list, stake input, payout, submit | `KitCard`, `KitRow`, `KitInput`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | studio | PhotoAlbum | Dense 24-shot grid or dated contact sheet, checks | `KitCard`, `KitGrid`, `KitPhoto`, `KitCheck`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | studio | BeforeAfter | Overlaid/paired photos, draggable wipe slider, toggle | `KitCard`, `KitPhoto`, `KitSlider`, `KitText`, `KitChip`, `KitAction` | None |
| 6 | studio | PresetPicker | Preview image, horizontal preset strip, intensity | `KitCard`, `KitPhoto`, `KitStrip`, `KitGrid`, `KitSlider`, `KitText`, `KitAction` | None |
| 6 | studio | BrandKit | Brand logo, closed swatch chips, font pair preview | `KitCard`, `KitPhoto`, `KitChip`, `KitGrid`, `KitRow`, `KitText`, `KitAction` | None |
| 6 | studio | Template | Aspect preview, 2–8 typed text/photo/swatch slots | `KitCard`, `KitPhoto`, `KitRow`, `KitInput`, `KitChip`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | studio | PromptStudio | Prompt box, style/aspect chips, 0–4 variant tiles | `KitCard`, `KitTextArea`, `KitGrid`, `KitPhoto`, `KitTrack`, `KitChip`, `KitText`, `KitAction` | None |
| 6 | studio | ExportQueue | Job thumbnails, format tags, progress bar, share | `KitCard`, `KitRow`, `KitPhoto`, `KitMeter`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | curation | PinGrid | Two-column staggered masonry pins, titles, save toggle | `KitPhoto`, `KitText`, `KitAction`, `KitEmpty`, `KitSkeleton` | `KitMasonry` |
| 6 | curation | PinDetail | Full pin photo, swatch chips, board picker, source link | `KitCard`, `KitPhoto`, `KitText`, `KitTrack`, `KitChip`, `KitRow`, `KitAction` | None |
| 6 | curation | IdeaBoards | Three-photo collage cards, count, collaborators, create | `KitCard`, `KitGrid`, `KitPhoto`, `KitText`, `KitTrail`, `KitAvatarStack`, `KitAction` | None |
| 6 | curation | CollageLayout | Two-to-four cutout slots on backdrop swatch, swap/clear | `KitCard`, `KitGrid`, `KitTile`, `KitPhoto`, `KitChip`, `KitText`, `KitAction` | None |
| 6 | curation | StyleQuiz | Paired mood photos or swatch palettes, selection toggle | `KitCard`, `KitGrid`, `KitPhoto`, `KitOption`, `KitChip`, `KitText`, `KitAction` | None |
| 6 | safety | CircleMap | Live avatar pins map, place status rows, battery pill | `KitCard`, `KitMapTile`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | safety | PlaceAlerts | Named geofence zones, radius, arrive/leave switches | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | safety | DriveSummary | Weekly safety score, trip cards, speed and event pills | `KitCard`, `KitContent`, `KitRow`, `KitGrid`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | safety | SosBeacon | Hold countdown trigger, silent toggle, contacts, alert banner | `KitCard`, `KitContent`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | `KitHoldButton` |
| 6 | safety | SafetyCheckIn | Timed arrival clock, contacts, overdue alert, safe CTA | `KitCard`, `KitContent`, `KitTime`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | dispatch | DriverStatus | Online/pause controls, zone demand pill, mode, earnings | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitTrack`, `KitChip`, `KitAction` | None |
| 6 | dispatch | OfferCard | Timed job offer, payout/distance, countdown bar, accept/decline | `KitCard`, `KitContent`, `KitRow`, `KitMeter`, `KitTime`, `KitText`, `KitAction` | None |
| 6 | dispatch | StopHandoff | Stop checklist, notes, contact actions, PIN/photo proof | `KitCard`, `KitRow`, `KitCheck`, `KitInput`, `KitText`, `KitAction` | None |
| 6 | dispatch | PayoutBreakdown | Base/tips/bonus rows, active/online time, trips, cashout | `KitCard`, `KitContent`, `KitRow`, `KitGrid`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | dispatch | ZoneDemand | Busyness pills, peak bonus badge, block window, dash/schedule | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | marketplace | Auction | Current bid, reserve pill, countdown, bid controls, bid rows | `KitCard`, `KitContent`, `KitRow`, `KitTime`, `KitInput`, `KitText`, `KitAction` | None |
| 6 | marketplace | OfferThread | Item preview, asking vs offer, expiry, accept/counter/decline | `KitCard`, `KitRow`, `KitPhoto`, `KitInput`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | marketplace | LiveDrop | Stream preview frame, pinned lot bar, chat snippets, bid/buy | `KitCard`, `KitPhoto`, `KitRow`, `KitBubble`, `KitInput`, `KitText`, `KitAction` | None |
| 6 | marketplace | BundleBox | Seller items checks, discount tier bar, weight, bundle totals | `KitCard`, `KitRow`, `KitPhoto`, `KitCheck`, `KitMeter`, `KitText`, `KitAction` | None |
| 6 | marketplace | ShippingLabel | Parcel tier, carrier choices, buyer destination, drop-off QR | `KitCard`, `KitRow`, `KitTrack`, `KitChip`, `KitCode`, `KitText`, `KitAction` | None |
| 6 | rpg | StatBlock | Four-to-eight ability tiles, modifiers, save proficiency ticks | `KitCard`, `KitGrid`, `KitTile`, `KitCheck`, `KitText`, `KitAction` | None |
| 6 | rpg | CombatTrack | Segmented HP/temp bar, damage/heal, AC, death pips, conditions | `KitCard`, `KitMeter`, `KitGrid`, `KitInput`, `KitTrack`, `KitChip`, `KitText`, `KitAction` | None |
| 6 | rpg | ResourceSlots | Spell/class pip rows, spend/restore toggles, rest confirms | `KitCard`, `KitRow`, `KitCheck`, `KitText`, `KitAction` | None |
| 6 | rpg | TraitList | Weapon/spell/trait rows, hit/DC pills, dice formula, roll | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | rpg | Initiative | Round header, turn-ordered combatants, HP bars, defeat/next | `KitCard`, `KitRow`, `KitMeter`, `KitTrack`, `KitChip`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | rpg | GearPack | Equipped/attuned/stowed rows, steppers, encumbrance, coins | `KitCard`, `KitRow`, `KitMeter`, `KitStepper`, `KitInput`, `KitText`, `KitAction` | None |
| 6 | kids | KidSwitch | Oversized illustrated child avatar tiles, age badge, parent link | `KitCard`, `KitGrid`, `KitTile`, `KitPhoto`, `KitText`, `KitAction` | None |
| 6 | kids | SoundGrid | Four-to-twelve oversized sound tiles, audio play/stop pulse | `KitCard`, `KitGrid`, `KitTile`, `KitPhoto`, `KitIcon`, `KitText`, `KitAction` | None |
| 6 | kids | StoryPage | Large illustration, 1–3 big lines, narration controls, paging | `KitCard`, `KitPhoto`, `KitContent`, `KitPlayback`, `KitText`, `KitAction` | None |
| 6 | kids | StickerBoard | Six-to-twelve earned color stickers and silhouette slots | `KitCard`, `KitGrid`, `KitTile`, `KitPhoto`, `KitIcon`, `KitText` | None |
| 6 | kids | VisualRoutine | Three-to-six icon-first routine cards, short labels, ticks | `KitCard`, `KitRow`, `KitTile`, `KitIcon`, `KitCheck`, `KitText`, `KitAction` | None |
| 6 | kids | ParentGate | Adult gate card with hold ring or runtime math challenge | `KitCard`, `KitContent`, `KitInput`, `KitText`, `KitAction` | `KitHoldButton` |
| 6 | beauty | Regimen | Window tabs, ordered AM/PM steps, conflict banner, ticks | `KitCard`, `KitTrack`, `KitChip`, `KitRow`, `KitPhoto`, `KitCheck`, `KitText` | None |
| 6 | beauty | ShelfLife | Opened product cards, PAO badges, expiry warnings, discard | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | beauty | IngredientCheck | Safety meter, skin-match pill, irritant flags, INCI rows | `KitCard`, `KitMeter`, `KitTrack`, `KitChip`, `KitRow`, `KitText`, `KitAction` | None |
| 6 | beauty | BeautyProfile | Skin type, concerns, undertone, swatch, hair texture selectors | `KitCard`, `KitTrack`, `KitChip`, `KitOption`, `KitText`, `KitAction` | None |
| 6 | beauty | Lookbook | Saved look photo cards, shade chips, formula note, copy | `KitCard`, `KitGrid`, `KitPhoto`, `KitChip`, `KitText`, `KitAction` | None |
| 6 | perks | OfferWall | Partner task/survey cards, milestone ticks, payout badges | `KitCard`, `KitContent`, `KitRow`, `KitCheck`, `KitTrail`, `KitText`, `KitAction` | None |
| 6 | perks | CouponFeed | Merchant promo cards, code copy box, verified age, votes | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 6 | perks | CashoutGoal | Points-to-cash meter, pending points, payout tiers, redeem | `KitCard`, `KitContent`, `KitMeter`, `KitOption`, `KitText`, `KitAction` | None |

## New bases backlog

Layer paths are under `packages/ui/src/kit/base/`. Types below use `ReactNode` from React and
`TextTone` from the current kit. Callers supply copy, formatted values, ids and computed drawing data.
Bases draw and dispatch through the shared kit; they never own catalog metadata, model names,
domain calculations, random outcomes, consent or network calls. Empty/error messages use existing bases.

```ts
type Drawing = { part?: string; loading?: boolean };
type Target = { item?: string; part: string };
type Column = { id: string; label: string; header: ReactNode };
type Cell = { id: string; content: ReactNode; target?: Target; disabled?: boolean };
type MatrixRow = { id: string; label: string; heading: ReactNode; cells: readonly Cell[]; selected?: boolean; target?: Target };
type Point = { id: string; x: number; value: number | null; label: string };
```

`loading` keeps the filled geometry and removes controls. Interactive targets have keyboard and native
actions; ordinary targets are at least the control token size. Dense matrices retain scrollable control
widths, not squeezed targets. Motion reads reduced-motion/agent mode; hidden faces never reach reads.

| Base | Layer | Props type | Draws | States | Used by | First wave |
| --- | --- | --- | --- | --- | --- | --- |
| `KitSlotGrid` | `time` | `Drawing & { times: readonly { id: string; label: string; sub?: string; taken: boolean }[]; at?: string; style?: "grid" \| "list" }` | Wrapping time chips or end-time rows; selected outline | Free, selected, taken/disabled, empty, loading | booking `Slots` | 1 |
| `KitScroll` | `surface` | `Drawing & { children: ReactNode; label: string; axis?: "vertical" \| "horizontal"; bounded?: boolean }` | Token-bounded scrolling content, visible scroll affordance | Filled, empty, loading; keyboard/focus scrolling | customers `Agreement`; data `FilterBar` | 1 |
| `KitSetRow` | `composition` | `Drawing & { item: string; label: string; fields: readonly { id: string; label: string; control: ReactNode }[]; done: ReactNode; detail?: ReactNode }` | Compact labelled number boxes, done target, optional rest detail | Editable, completed, disabled children, empty, loading | health `Workout` | 2 |
| `KitTable` | `matrix` (new) | `Drawing & { columns: readonly Column[]; rows: readonly MatrixRow[]; corner: ReactNode; stickyFirst?: boolean; activeColumn?: string; headerTargets?: readonly { column: string; target: Target }[]; separators?: readonly string[] }` | Sticky row labels, sideways columns, aligned cells, cut lines | Filled, selected row/column, disabled cells, empty, loading | health `HabitGrid`; kitchen `MealPlan`; play `ScoreSheet`; learning `Timetable`; events `FindDate`; data `Table`; team `Roster`, `Timesheet`; sports `Standings` | 2 |
| `KitColumns` | `matrix` (new) | `Drawing & { columns: readonly { id: string; label: string; count: string; summary?: ReactNode; children: ReactNode }[]; style?: "columns" \| "stack" }` | Two to five counted card columns, sideways scroll or vertical stack | Filled, empty columns, loading; child move/press targets | play `TeamPicker`; data `Board`; hiring `ApplicantPipeline` | 2 |
| `KitWeekMatrix` | `matrix` (new) | `Drawing & { days: readonly Column[]; rows: readonly MatrixRow[]; corner: ReactNode; orientation?: "daysAcross" \| "daysDown"; today?: string; trailing?: readonly { row: string; content: ReactNode }[] }` | Seven-day table using `KitTable`, today emphasis, optional totals | Marked, blank/add cells, selected, disabled future cells, empty, loading | health `HabitGrid`; kitchen `MealPlan`; learning `Timetable`; team `Roster`, `Timesheet` | 2 |
| `KitLinePlot` | `plot` (new) | `Drawing & { series: readonly { id: string; label: string; tone?: TextTone; points: readonly Point[] }[]; unit?: string; goal?: { value: number; label: string }; selected?: string; targets?: readonly { point: string; target: Target }[]; style?: "full" \| "compact" }` | One to three lines, labelled axes/legend, dashed goal, point cursor | Rising/falling/flat, signed/zero values, missing-value gaps, selected, empty, loading | health `Measurements`; money `PriceChart`, `Payoff`; data `LineChart`; invest `Performance` | 2 |
| `KitRangeBand` | `plot` (new) | `Drawing & { label: string; min: number; max: number; low: number; high: number; value: number; tone?: "text" \| "warn" }` | Low/normal/high band with reading marker; endpoints clamped visually | In range, outside range, equal normal bounds, loading | health `Vitals`; home `Devices` (sensor with normal range) | 2 |
| `KitRadialTrack` | `radial` (new) | `Drawing & ({ style: "rings"; rings: readonly { id: string; ratio: number; tone: TextTone }[]; children?: ReactNode } \| { style: "days"; segments: readonly { id: string; tone: TextTone; current?: boolean }[]; children?: ReactNode })` | Concentric arcs or segmented circumference, centred content | Zero/partial/full rings; marked/current days; empty, loading | health `ActivityRings`, `Cycle` | 2 |
| `KitJar` | `data` | `Drawing & { ratio: number; label: string; children?: ReactNode }` | Jar outline with normalized fill and centred value | Empty, partially filled, full, loading | home `Rewards` | 2 |
| `KitNumberPad` | `input` | `Drawing & { value: string; label: string; keys: readonly { id: string; label: string; value: string; disabled?: boolean }[]; target: Target; disabled?: boolean }` | Large numeric keypad, decimal and backspace keys | Blank, entered, limit/disabled keys, loading | money `AmountPad` | 2 |
| `KitDiceFace` | `game` (new) | `Drawing & { item: string; value?: number; held: boolean; label: string; disabled?: boolean; holdPart?: string } & ({ sides: 6; style?: "pips" \| "numbers" } \| { sides: 4 \| 8 \| 10 \| 12 \| 20; style: "numbers" })` | Six-sided pip face or numbered face, held outline | Unrolled, rolled, held, rolling/loading, disabled hold | play `Dice` | 2 |
| `KitWheel` | `game` (new) | `Drawing & { options: readonly { id: string; label: string; disabled?: boolean }[]; at?: string; rotation: number; busy?: boolean; style?: "wheel" \| "strip" }` | Equal sectors and pointer or sliding option rail | Undrawn, chosen, spinning/loading, used options, exhausted | play `Spinner` | 2 |
| `KitOrbit` | `game` (new) | `Drawing & { nodes: readonly { id: string; label: string; content: ReactNode }[]; at: string; reverse?: boolean; style?: "ring" \| "queue" }` | Circular ordered nodes, direction mark, current emphasis or queue | Current, next, reversed, completed children, loading | play `TurnOrder` | 2 |
| `KitFlip` | `composition` | `Drawing & { front: ReactNode; back: ReactNode; flipped: boolean; label: string; target: Target; disabled?: boolean }` | Two-faced card, one face mounted/readable at a time | Front, back, disabled, loading; reduced-motion reveal | learning `Flashcard` | 3 |
| `KitBreath` | `radial` (new) | `Drawing & { progress: number; phase: "inhale" \| "hold" \| "exhale" \| "rest"; label: string; children: ReactNode; paused?: boolean; target: Target }` | Soft expanding/contracting circle with centred phase copy | Idle, inhale, hold, exhale, rest, paused, complete, loading | mind `Breathe` | 3 |
| `KitTicket` | `composition` | `Drawing & { children: ReactNode; code?: ReactNode; style?: "card" \| "pass"; used?: boolean; target?: Target; label: string }` | Ticket surface, perforation, separate code area | Card/pass, without code, issued, used, loading | trips `Reservation`; events `Ticket` | 3 |
| `KitCode` | `codes` (new) | `Drawing & { value?: string; label: string; used?: boolean }` | QR payload with fixed light/dark modules and quiet zone | Valid payload, unavailable/empty, used, loading | trips `Reservation`; social `Invite`; events `Ticket` | 3 |
| `KitPath` | `diagram` (new) | `Drawing & { nodes: readonly { id: string; label: string; content: ReactNode; state: "done" \| "current" \| "locked"; milestone?: boolean; target?: Target }[] }` | Winding connected unit nodes, milestone mark | Done, current, locked/disabled, empty, loading | learning `Path` | 3 |
| `KitSeatMap` | `planning` (new) | `Drawing & { tables: readonly { id: string; label: string; shape: "round" \| "long"; seats: readonly { id: string; label: string; initials?: string; selected?: boolean; target?: Target }[]; target?: Target }[]; tray?: ReactNode }` | Round/long tables, occupied/empty seats with initials, tray | Unassigned, assigned, selected targets, full, empty, loading | events `Seating` | 4 |
| `KitHeatGrid` | `plot` (new) | `Drawing & { rows: readonly { id: string; label: string; cells: readonly { id: string; level: number; label: string }[] }[]; columns: readonly { id: string; label: string }[]; legend: readonly { level: number; label: string }[]; style: "weeks" \| "hours" }` | Scrollable intensity cells, day/hour axes, scale legend | Zero/nonzero levels, filled, loading | data `Heatmap` | 5 |
| `KitScore` | `game` (new) | `Drawing & { sides: readonly [{ label: string; value: string; controls?: ReactNode }, { label: string; value: string; controls?: ReactNode }]; center: ReactNode; style?: "display" \| "keeper" }` | Two large numbers with status/clock between, keeper controls | Upcoming, live, break, final children, loading | sports `Scoreboard` | 5 |
| `KitPitch` | `diagram` (new) | `Drawing & { lines: readonly { id: string; players: readonly { id: string; label: string; number: string; target?: Target }[] }[]; substitutes?: ReactNode; style?: "pitch" \| "list" }` | Token-themed pitch markings and player lines or grouped list | Filled, substitutes, empty, loading | sports `Lineup` | 5 |
| `KitBracket` | `diagram` (new) | `Drawing & { rounds: readonly { id: string; label: string; ties: readonly { id: string; sides: readonly [{ label: string; score?: string }, { label: string; score?: string }]; winner?: 0 \| 1; selected?: boolean; target?: Target }[] }[]; links: readonly { from: string; to: string }[] }` | Scrollable tie cards and round connectors | Unplayed, partial scores, decided/tied, selected team, loading | sports `Bracket` | 5 |
| `KitGantt` | `planning` (new) | `Drawing & { columns: readonly { id: string; label: string }[]; rows: readonly { id: string; label: string; start: number; end: number; clippedStart?: boolean; clippedEnd?: boolean; conflict?: boolean; target?: Target }[]; gates: readonly { id: string; label: string; at: number; target?: Target }[]; links: readonly { from: string; to: string }[] }` | Sticky task names, normalized range bars, diamonds, dependency links | Overlapping, clipped, conflicting ranges, milestones, empty, loading | projects `Gantt` | 5 |
| `KitSignaturePad` | `drawing` (new) | `Drawing & { label: string; mark?: string; disabled?: boolean; target: Target }` | Touch/stylus pad and host-resolved private mark | Blank, draft, saved/disabled, loading, unavailable adapter | paperwork `Signature` | 5 |
| `KitMicCapture` | `audio` (new) | `Drawing & { label: string; recording: boolean; level: number; elapsedSeconds?: number; disabled?: boolean; target: Target; style?: "hold" \| "toggle" }` | Hold or tap microphone capture control with live level bar (`ok` permission) | Idle, listening/recording, paused, unavailable/denied, loading | learning `SpeechCheck`; utilities `Translator`; assistant `PromptComposer` | 6 |
| `KitCodeBlock` | `rich` (new) | `Drawing & { code: string; language?: string; label?: string; copyTarget: Target; wrap?: boolean }` | Monospace syntax or equation block with header badge and one-tap copy target | Multi-line, wrapped, copied state, empty, loading | assistant `AiThread`, `ArtifactCard`; learning `WorkedSolution` | 6 |
| `KitVoiceOrb` | `radial` | `Drawing & { state: "idle" \| "listening" \| "thinking" \| "speaking"; level: number; label: string; children?: ReactNode; target: Target }` | Reactive voice session orb with normalized amplitude pulse and state ring | Idle, listening, thinking, speaking, muted, loading | assistant `VoiceOrb` | 6 |
| `KitCalcPad` | `keys` | `Drawing & { keys: readonly { id: string; label: string; value: string; role?: "digit" \| "op" \| "fn" \| "eq"; disabled?: boolean }[]; scientific?: boolean; target: Target; disabled?: boolean }` | Extended arithmetic and toggleable scientific keypad building on `KitNumberPad` | Standard, scientific drawer, disabled keys, loading | utilities `Calculator` | 6 |
| `KitDialGauge` | `radial` | `Drawing & { ratio: number; value: string; unit: string; phase: string; scaleLabels?: readonly string[] }` | Speedometer radial dial arc with central live speed and phase indicator | Idle, active phase, peak, loading | utilities `SpeedGauge` | 6 |
| `KitMasonry` | `rich` (new) | `Drawing & { columns?: 2; items: readonly { id: string; ratio: number; children: ReactNode }[] }` | Two-column staggered variable-aspect card layout | Multi-ratio items, single item, empty, loading | curation `PinGrid` | 6 |
| `KitHoldButton` | `controls` (new) | `Drawing & { label: string; progress: number; holding: boolean; armedLabel?: string; disabled?: boolean; target: Target }` | Press-and-hold radial countdown trigger preventing accidental activation | Idle, holding, armed, disabled, loading | safety `SosBeacon`; kids `ParentGate` | 6 |
| `KitPanelStrip` | `rich` (new) | `Drawing & { mode: "strip" \| "ltr" \| "rtl"; panels: readonly { id: string; ratio: number; content: ReactNode }[]; current?: number; target?: Target }` | Gapless vertical comic strip or directional horizontal snapped panel pager | Vertical scroll, LTR/RTL page snap, zoomed/HUD hidden, empty, loading | comics `ComicReader` | 6 |
| `KitRemotePad` | `controls` (new) | `Drawing & { label: string; hasMic?: boolean; target: Target; disabled?: boolean }` | Directional D-pad ring with OK center, mic, and media/volume key cluster | Connected, offline/disabled, loading | watch `RemoteControl` | 6 |
| `KitSeatGrid` | `boards` (new) | `Drawing & { screenLabel?: string; sections: readonly { id: string; label: string; rows: readonly { label: string; seats: readonly { id: string; label: string; kind: "free" \| "taken" \| "selected" \| "aisle"; target?: Target }[] }[] }[] }` | Numbered row-by-column seat grid with aisles and screen/nose marker | Available, selected, taken, multi-cabin, empty, loading | trips `CabinSeats`; watch `SeatPicker` | 6 |
| `KitCellGrid` | `boards` (new) | `Drawing & { rows: number; cols: number; cells: readonly { id: string; row: number; col: number; value?: string; notes?: readonly string[]; clue?: string; state: "empty" \| "given" \| "draft" \| "correct" \| "present" \| "absent" \| "conflict"; selected?: boolean; target?: Target }[] }` | Discrete `4×4` to `9×9` puzzle letter or digit grid with pencil notes and clue marks | Empty, given, draft, scored Wordle states, conflict, loading | puzzles `WordGrid`, `NumberGrid` | 6 |
| `KitLetterKeys` | `keys` | `Drawing & { layout: "qwerty" \| "hive"; keys: readonly { id: string; label: string; value: string; center?: boolean; state?: "unused" \| "correct" \| "present" \| "absent"; target: Target }[]; disabled?: boolean }` | State-tinted QWERTY keyboard or center-required anagram letter wheel | Unused, state-tinted, disabled, loading | puzzles `LetterBank` | 6 |

`KitTable` cells contain caller-built controls and formatted text, not raw records. `KitWeekMatrix`
requires exactly seven day headers; days-down transposes headings and cells. Ratios, levels, positions
and progress are normalized 0–1; wheel rotation is turns. Code payloads and marks come from host
adapters, never invented by a drawing. A missing adapter leaves the pad unavailable, not fake consent.

Folder budgets reserve one base file and one adjacent test per new base, plus `README.md` and
`index.ts` for new layers. No moves or splits of existing files are required.

| Layer | Existing files | New bases | Reserved total files |
| --- | --- | --- | --- |
| `surface` | 10 | `KitScroll` | 12 |
| `time` | 6 | `KitSlotGrid` | 8 |
| `composition` | 5 | `KitSetRow`, `KitFlip`, `KitTicket` | 11 |
| `data` | 9 | `KitJar` | 11 |
| `input` | 10 | `KitNumberPad` | 12 |
| `matrix` (new) | 0 | `KitTable`, `KitColumns`, `KitWeekMatrix` | 8 |
| `plot` (new) | 0 | `KitLinePlot`, `KitRangeBand`, `KitHeatGrid` | 8 |
| `radial` (new) | 0 | `KitRadialTrack`, `KitBreath` | 6 |
| `game` (new) | 0 | `KitDiceFace`, `KitWheel`, `KitOrbit`, `KitScore` | 10 |
| `codes` (new) | 0 | `KitCode` | 4 |
| `diagram` (new) | 0 | `KitPath`, `KitPitch`, `KitBracket` | 8 |
| `planning` (new) | 0 | `KitSeatMap`, `KitGantt` | 6 |
| `drawing` (new) | 0 | `KitSignaturePad` | 4 |

New layers depend through doors: `matrix` on text/surface; `plot`, `radial`, `game`, `codes`, `diagram`,
`planning`, `drawing` on text; `composition` may compose them. `media` and `helpers` already have
12 files each; no new files go there. Reserve extra helpers/tests only within the remaining headroom.

### Wave 6 folder budget

Because `planning` and `game` reached the 12-file folder rule during Waves 1–5 helpers/tests (and `KitNumberPad` lives in `keys` with 6 current files), Wave 6 places its 12 new bases across existing layers with headroom plus 4 new layers, keeping every folder strictly `<= 12` files:

| Layer | Current files (post-W5) | Wave 6 new bases | Reserved total files |
| --- | --- | --- | --- |
| `radial` | 6 | `KitVoiceOrb`, `KitDialGauge` | 10 |
| `keys` | 6 | `KitCalcPad`, `KitLetterKeys` | 10 |
| `audio` (new) | 0 | `KitMicCapture` | 4 |
| `rich` (new) | 0 | `KitCodeBlock`, `KitMasonry`, `KitPanelStrip` | 8 |
| `controls` (new) | 0 | `KitHoldButton`, `KitRemotePad` | 6 |
| `boards` (new) | 0 | `KitSeatGrid`, `KitCellGrid` | 6 |

## Base changes

One row per existing base. Additions are optional and retain current defaults; unrelated core drawings
stay unchanged. Labels, pending/error copy and derived domain states still come from callers/host.

| Base | Exact prop addition/change | Draws or enables | Used by | First wave |
| --- | --- | --- | --- | --- |
| `KitPhoto` | Make `photo` optional; add `initials?: string; ring?: "none" \| "accent" \| "muted"; aspect?: "square" \| "wide" \| "tall"` | Caller-supplied initials when no photo; selected/unseen or seen avatar outline; Wave 6 portrait aspect | booking `StaffPicker`; home `Agenda`; social `Stories`; sports `Fixtures`; studio / curation Wave 6 | 1 |
| `KitCheck` | `disabled?: boolean; readonly?: boolean` | Unavailable checkbox; static completed tick without action | customers `Agreement`; health `Workout`, `HabitGrid`; requests `WorkOrder`, `RequestResolution`; projects `Tasks`, `Scope`; paperwork `Signature` | 1 |
| `KitAction` | Extend `action` to `"press" \| "dismiss" \| "play" \| "pause" \| "toggle" \| "select" \| "check" \| "set" \| "type" \| "increment" \| "decrement" \| "start" \| "stop" \| "send" \| "scan" \| "copy"`; add `value?: string \| number \| boolean` | Dispatch declared non-press actions (`copy` added in Wave 6); keep existing disabled support | health `Workout`; kitchen `Ingredients`, `CookSteps`, `KitchenTimers`; home `Rewards`, `BabyLog`, `Devices`; commerce `Product`, `Cart`; mind `Soundscape`; requests `RequestThread`, `WorkOrder`; events `Door`; sports `Scoreboard`; projects `TimeLog`; hiring `Interview`, `Offer`; Wave 6 `security`, `utilities`, `assistant`, `perks` | 2 |
| `KitInput` | `action?: "type" \| "set"; disabled?: boolean; min?: number; max?: number; step?: number` | Numeric/date set controls, bounded/disabled edits; default remains type | play `ScoreSheet`; money `Payoff`; requests `WorkOrder`; property `Units`, `Inspections`; books `Expenses`; hiring `Candidate` | 2 |
| `KitSlider` | `step?: number; disabled?: boolean` | Half-degree steps and pending/offline controls | home `Devices`; health `SymptomLog` | 2 |
| `KitTrail` | `disabled?: boolean; tone?: TextTone` | Pending switches and good/warn/bad status pills | home `Devices`; money `Bills`; commerce `ProductGrid`; property `Units`, `RentRoll`; events `GuestList`; places `Departures`; inventory `Things` | 2 |
| `KitCard` | `swatch?: Swatch` (`Swatch` is the existing catalog type) | Fixed account swatch with matching readable foreground tokens | money `AccountCard` | 2 |
| `KitTile` | `on?: boolean; disabled?: boolean; detail?: ReactNode; action?: "press" \| "toggle" \| "start" \| "stop"` | Selected/locked tiles, secondary copy, declared root action through controller (currently links only) | home `BabyLog`; mind `Factors`; learning `Achievements` | 2 |
| `KitChip` | `disabled?: boolean; swatch?: Swatch; look?: "pill" \| "segment" \| "box"` (extends `look`) | Unavailable/crossed-out variants, square size targets, fixed swatches | commerce `VariantPicker`; property `Viewings`, `Inspections` | 3 |
| `KitScaleTrack` | `single?: boolean` (only with `readonly: true`, `style: "mood"`) | One chosen mood face, not the five-face selection track | mind `Entries`, `SleepLog` | 3 |
| `KitText` | `emphasis?: "normal" \| "strong" \| "emphasis"; goto?: string; item?: string` | Inline strong/italic runs and addressed screen links | media `Article` | 4 |
| `KitRow` | `indent?: 0 \| 1; selected?: boolean; tone?: TextTone` | One-level replies/subtasks; current-row and status tint | social `Comments`; places `MapList`; projects `Tasks`; media `ChapterList`; property `Units` | 3 |
| `KitMapTile` | `pins?: readonly { id: string; label: string; x: number; y: number; selected?: boolean; mark?: "pin" \| "dot" \| "price" \| "avatar"; target?: Target }[]` | Supplied normalized pins, price tags, avatar markers, selected/courier markers | places `MapList`, `DeliveryTracker`; realestate `PropertySearch`; safety `CircleMap` | 4 |
| `KitRouteStop` | `goto?: string; mark?: "route" \| "dot" \| "check"` | Linked milestone rail with neutral dot or completed tick, not a destination pin | projects `Milestones` | 5 |
| `KitLinePlot` | Add optional `band?: { low: readonly number[]; high: readonly number[] }` and `baseline?: number` | Reference percentile/confidence envelope and centered momentum baseline | sports `MomentumChart`; realestate `ValueHistory`; parenting `GrowthChart` | 6 |

`KitRow.selected`/`tone` first serve property `Units` in wave 3; indentation waits for wave 4 replies.
`KitAction` still uses the shared controller's validation; `copy` in Wave 6 is the sole vocabulary extension and uses the same clipboard/runtime handler. `KitCard.swatch` supplies a surface context for child text, not a free colour prop.
`KitMapTile` keeps its existing `count` path when `pins` is absent; it does not fetch a real map.
`KitTile.action` and linked `KitRouteStop` use that controller too; they never bypass confirmation.
Folded groups compose `KitRow` with `expanded` and caller-controlled children; `KitListItem` only
accepts a text body, so it cannot hold nested stops or claimant controls.

## Build order

Each row is the additional work before that wave's scaffolds. Earlier bases/options are reused, not
rebuilt. Within a cell, arrows give dependencies; semicolons separate independent small builds.

| Wave | New bases, smallest dependency set first | Existing-base changes due | Reuse from earlier waves |
| --- | --- | --- | --- |
| 1 | `KitScroll`; `KitSlotGrid` | `KitPhoto`, `KitCheck` | Current kit only |
| 2 | `KitSetRow`; `KitJar`; `KitRangeBand`; `KitNumberPad`; `KitDiceFace`; `KitOrbit`; `KitWheel`; `KitRadialTrack`; `KitLinePlot`; `KitColumns`; `KitTable` → `KitWeekMatrix` | `KitAction`, `KitInput`, `KitSlider`, `KitTrail`, `KitCard`, `KitTile` | Wave 1 bases and options |
| 3 | `KitFlip`; `KitBreath`; `KitPath`; `KitCode` → `KitTicket` | `KitRow`, `KitChip`, `KitScaleTrack` | `KitTable`, `KitWeekMatrix`, `KitRangeBand`; wave 1–2 controls |
| 4 | `KitSeatMap` | `KitText`, `KitMapTile`; reuse avatar rings and row indentation | `KitCode`, `KitTicket`, `KitTable`; earlier rows/controls |
| 5 | `KitScore`; `KitHeatGrid`; `KitPitch`; `KitBracket`; `KitGantt`; `KitSignaturePad` (private-mark adapter first) | `KitRouteStop` | `KitScroll`, `KitTable`, `KitColumns`, `KitWeekMatrix`, `KitLinePlot`; all earlier options |
| 6 | `KitMicCapture`; `KitCodeBlock`; `KitVoiceOrb`; `KitCalcPad`; `KitDialGauge`; `KitMasonry`; `KitHoldButton`; `KitPanelStrip`; `KitRemotePad`; `KitSeatGrid`; `KitCellGrid`; `KitLetterKeys` | `KitAction` (`copy`), `KitPhoto` (`aspect`), `KitMapTile` (`price`/`avatar` pins), `KitLinePlot` (`band`/`baseline`) | All Waves 1–5 bases and options |

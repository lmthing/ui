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
| 1 | customers | ClientCard | Portrait, summary, tags, contact actions | `KitCard`, `KitContent`, `KitPhoto`, `KitText`, `KitTrack`, `KitChip`, `KitAction` | None |
| 1 | customers | ClientHistory | Dated icon rows, signed amounts | `KitCard`, `KitRow`, `KitTime`, `KitIcon`, `KitText`, `KitTrail` | None |
| 1 | customers | Invoice | Document headings, quantity/price lines, totals | `KitCard`, `KitContent`, `KitRow`, `KitGrid`, `KitText`, `KitTrail`, `KitAction` | None |
| 1 | customers | PaymentStatus | Status headline, amount, dates, actions | `KitCard`, `KitContent`, `KitText`, `KitIcon`, `KitAction` | None |
| 1 | customers | Review | Stars, five horizontal bars, review/reply rows | `KitCard`, `KitRow`, `KitContent`, `KitText`, `KitScaleTrack`, `KitMeter`, `KitAction` | None |
| 1 | customers | Loyalty | Stamp circles, reward line, redeem | `KitCard`, `KitContent`, `KitGrid`, `KitDayMark`, `KitText`, `KitAction` | None |
| 1 | customers | Agreement | Bounded terms, agreement tick, typed name | `KitCard`, `KitText`, `KitCheck`, `KitInput` | `KitScroll` |

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
| 2 | kitchen | Ingredients | Grouped checks, amounts, servings, unit switch | `KitCard`, `KitRow`, `KitText`, `KitCheck`, `KitAction`, `KitTrack`, `KitChip` | None |
| 2 | kitchen | CookSteps | One large step, ingredients, timer, next/back | `KitCard`, `KitContent`, `KitText`, `KitTrack`, `KitChip`, `KitAction` | None |
| 2 | kitchen | MealPlan | Days by meals, photos, empty add cells | `KitCard`, `KitText`, `KitPhoto`, `KitAction` | `KitTable`, `KitWeekMatrix` |
| 2 | kitchen | GroceryList | Aisle headings, quantity checks, add field | `KitCard`, `KitRow`, `KitText`, `KitCheck`, `KitInput` | None |
| 2 | kitchen | Pantry | Food tiles, quantities, expiry marks, remove | `KitCard`, `KitGrid`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 2 | kitchen | FoodLog | Meal groups, food rows, calorie total/target | `KitCard`, `KitRow`, `KitText`, `KitMeter`, `KitAction` | None |
| 2 | kitchen | KitchenTimers | Named rings, countdowns, pause, add minute | `KitCard`, `KitGrid`, `KitRow`, `KitRing`, `KitText`, `KitAction` | None |
| 2 | home | Chores | Avatar rows, repeat/due, points, tick | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail`, `KitCheck` | None |
| 2 | home | Rewards | Filled jars, portraits, prize shelf, claim | `KitCard`, `KitGrid`, `KitRow`, `KitPhoto`, `KitStrip`, `KitIcon`, `KitText`, `KitAction` | `KitJar` |
| 2 | home | CareSchedule | Care tiles, last/next dates, overdue, done | `KitCard`, `KitGrid`, `KitRow`, `KitIcon`, `KitText`, `KitTrail`, `KitAction` | None |
| 2 | home | Turns | Current portrait, next people, advance/skip | `KitCard`, `KitContent`, `KitPhoto`, `KitRow`, `KitText`, `KitAction` | None |
| 2 | home | Agenda | Day headings, time rows, initials, conflicts | `KitCard`, `KitRow`, `KitTime`, `KitPhoto`, `KitText`, `KitTrail`, `KitAction` | None |
| 2 | home | BabyLog | Start/stop tiles, running clock, dated log | `KitCard`, `KitGrid`, `KitTile`, `KitRow`, `KitTime`, `KitText`, `KitAction` | None |
| 2 | home | Devices | Room/scene tiles, switches, set point, range | `KitCard`, `KitGrid`, `KitRow`, `KitIcon`, `KitText`, `KitTrail`, `KitSlider`, `KitAction` | `KitRangeBand` |
| 2 | money | AccountCard | Coloured account cards, balance, sideways rail | `KitCard`, `KitStrip`, `KitRow`, `KitContent`, `KitText` | None |
| 2 | money | Transactions | Day headings, category icons, signed amounts | `KitCard`, `KitRow`, `KitIcon`, `KitText`, `KitTrail` | None |
| 2 | money | Bills | Due/subscription rows, paid ticks, totals | `KitCard`, `KitRow`, `KitIcon`, `KitText`, `KitCheck`, `KitTrail` | None |
| 2 | money | Split | Portrait balances, settle rows, expense list | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitAction` | None |
| 2 | money | AmountPad | Large amount, decimal keypad, backspace, note | `KitCard`, `KitText`, `KitInput` | `KitNumberPad` |
| 2 | money | PriceChart | Price line, current/change, range tabs | `KitCard`, `KitText`, `KitTrack`, `KitChip` | `KitLinePlot` |
| 2 | money | Loan | Terms, next principal/interest, schedule rows | `KitCard`, `KitContent`, `KitRow`, `KitGrid`, `KitText`, `KitShare`, `KitAction` | None |
| 2 | money | Payoff | Headline, debt order, balance line, extra input | `KitCard`, `KitContent`, `KitRow`, `KitText`, `KitTrack`, `KitChip`, `KitInput`, `KitAction` | `KitLinePlot` |
| 2 | play | ScoreSheet | Sticky players, round headers, editable totals | `KitCard`, `KitText`, `KitInput`, `KitTrack`, `KitChip`, `KitAction` | `KitTable` |
| 2 | play | Dice | Pip/number faces, held marks, sum, roll | `KitCard`, `KitGrid`, `KitText`, `KitAction` | `KitDiceFace` |
| 2 | play | Spinner | Wheel or moving strip, pointer, result | `KitCard`, `KitText`, `KitAction` | `KitWheel` |
| 2 | play | Trivia | Hidden/revealed answer, photo, large question | `KitCard`, `KitContent`, `KitPhoto`, `KitText`, `KitAction` | None |
| 2 | play | TurnOrder | Circular player order or queue, current, lap | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitAction` | `KitOrbit` |
| 2 | play | TeamPicker | Counted team columns or grouped player rows | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitAction` | `KitColumns` |

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
| 3 | mind | Entries | Month groups, mood face, tags, thumbnail | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTrack`, `KitChip`, `KitScaleTrack` | None |
| 3 | mind | Factors | Selected icon tile grid | `KitCard`, `KitGrid`, `KitTile`, `KitText` | None |
| 3 | mind | Feelings | Family grid, selected word chips | `KitCard`, `KitGrid`, `KitText`, `KitTrack`, `KitChip` | None |
| 3 | mind | Breathe | Growing circle, phase word, remaining rounds | `KitCard`, `KitText`, `KitAction` | `KitBreath` |
| 3 | mind | SleepLog | Sleep/awake share bar, times, quality, average | `KitCard`, `KitContent`, `KitText`, `KitShare`, `KitScaleTrack`, `KitAction` | None |
| 3 | mind | Soundscape | Icon tiles, independent volume sliders, play | `KitCard`, `KitGrid`, `KitRow`, `KitIcon`, `KitText`, `KitSlider`, `KitAction` | None |
| 3 | mind | Patterns | Finding sentences, paired comparison bars | `KitCard`, `KitRow`, `KitText`, `KitBars` | None |
| 3 | trips | Itinerary | Folded day groups, timed stops, travel legs | `KitCard`, `KitRow`, `KitTime`, `KitIcon`, `KitText` | None |
| 3 | trips | Reservation | Perforated ticket/pass, route times, reference | `KitText`, `KitRow`, `KitGrid`, `KitIcon`, `KitAction` | `KitTicket`, `KitCode` |
| 3 | trips | PackingList | Grouped quantity checks, packed share, add | `KitCard`, `KitRow`, `KitText`, `KitCheck`, `KitMeter`, `KitInput` | None |
| 3 | trips | Weather | Today icon/high/low, forecast strip, offline | `KitCard`, `KitContent`, `KitIcon`, `KitText`, `KitStrip`, `KitRow`, `KitEmpty` | None |
| 3 | trips | TravelDocs | Masked document rows, owner, expiry warnings | `KitCard`, `KitRow`, `KitIcon`, `KitText`, `KitTrail` | None |
| 3 | trips | Converter | Paired amount fields, swap, rate date | `KitCard`, `KitRow`, `KitInput`, `KitText`, `KitAction` | None |
| 3 | trips | Clocks | Place/time grid, offsets, day/night icons | `KitCard`, `KitGrid`, `KitRow`, `KitText`, `KitIcon` | None |
| 3 | learning | Lesson | Explanation, photo, tinted example, continue | `KitCard`, `KitContent`, `KitPhoto`, `KitBlock`, `KitText`, `KitAction` | None |
| 3 | learning | Quiz | Choices, typed answer, paired match columns | `KitCard`, `KitText`, `KitOption`, `KitInput`, `KitGrid`, `KitChip`, `KitPhoto`, `KitAction` | None |
| 3 | learning | Flashcard | Two card faces, hidden answer, review controls | `KitCard`, `KitPhoto`, `KitText`, `KitAction` | `KitFlip` |
| 3 | learning | Path | Winding linked nodes, locked/current, trophies | `KitCard`, `KitIcon`, `KitText`, `KitAction` | `KitPath` |
| 3 | learning | Result | Score, counts, time, points, mistake rows | `KitCard`, `KitContent`, `KitGrid`, `KitRow`, `KitText`, `KitAction` | None |
| 3 | learning | Achievements | Badge grid, earned dates, locked explanation | `KitCard`, `KitGrid`, `KitTile`, `KitIcon`, `KitText` | None |
| 3 | learning | Timetable | Week/day selectors, period rows, current mark | `KitCard`, `KitText`, `KitTrack`, `KitChip`, `KitRow`, `KitTime`, `KitTrail` | `KitTable`, `KitWeekMatrix` |
| 3 | learning | Assignments | Subject marks, due/grade rows, done checks | `KitCard`, `KitRow`, `KitIcon`, `KitText`, `KitCheck`, `KitTrail` | None |
| 3 | requests | RequestQueue | Status groups, urgency/deadline rows, tabs | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitTrack`, `KitChip`, `KitAction` | None |
| 3 | requests | RequestTriage | Priority/queue selectors, duplicates, reason | `KitCard`, `KitText`, `KitTrack`, `KitChip`, `KitOption`, `KitRow`, `KitInput`, `KitAction` | None |
| 3 | requests | RequestThread | Authored replies/photos, event rows, audience | `KitCard`, `KitRow`, `KitBubble`, `KitPhoto`, `KitText`, `KitIcon`, `KitTrack`, `KitChip`, `KitTextArea`, `KitAction` | None |
| 3 | requests | WorkOrder | Work document, required checks, parts, clock | `KitCard`, `KitRow`, `KitGrid`, `KitText`, `KitCheck`, `KitInput`, `KitTrack`, `KitChip`, `KitAction` | None |
| 3 | requests | RequestResolution | Outcome choices, evidence, verification, reopen | `KitCard`, `KitText`, `KitTrack`, `KitChip`, `KitCheck`, `KitGrid`, `KitPhoto`, `KitInput`, `KitAction` | None |
| 3 | property | Units | Occupancy photo rows/cards, date field, badges | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail`, `KitInput` | None |
| 3 | property | RentRoll | Ledger sections, amounts, receipt/void actions | `KitCard`, `KitRow`, `KitGrid`, `KitText`, `KitTrail`, `KitAction` | None |
| 3 | property | Viewings | Date/time rows/cards, outcome choices, actions | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitTrack`, `KitChip`, `KitAction` | None |
| 3 | property | Inspections | Room selector, condition choices, notes/photos | `KitCard`, `KitRow`, `KitText`, `KitTrack`, `KitChip`, `KitInput`, `KitGrid`, `KitPhoto`, `KitAction` | None |
| 3 | property | Meters | Meter selectors, value/history rows, evidence | `KitCard`, `KitRow`, `KitText`, `KitTrack`, `KitChip`, `KitPhoto`, `KitAction` | None |

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
| 4 | media | Article | Paragraphs, headings, lists, emphasis, links | `KitCard`, `KitContent`, `KitRow`, `KitIcon`, `KitPhoto`, `KitText` | None |
| 4 | media | Library | Cover grid, progress, new badges | `KitCard`, `KitGrid`, `KitRow`, `KitPhoto`, `KitText`, `KitMeter`, `KitTrail` | None |
| 4 | media | Collection | Large artwork, title, summary, play/follow | `KitCard`, `KitPhoto`, `KitContent`, `KitText`, `KitAction` | None |
| 4 | media | Playlist | Number/artwork rows, played bar, download | `KitCard`, `KitRow`, `KitRank`, `KitPhoto`, `KitText`, `KitMeter`, `KitIcon`, `KitAction` | None |
| 4 | media | ChapterList | Timestamp rail, current chapter, seek links | `KitCard`, `KitRow`, `KitTime`, `KitText`, `KitTrail` | None |
| 4 | media | MiniPlayer | Slim bottom artwork/title, progress, play/pause | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitMeter`, `KitAction` | None |
| 4 | media | Highlights | Quote/time cards, source, note, source link | `KitCard`, `KitRow`, `KitContent`, `KitText`, `KitTime` | None |
| 4 | events | GuestList | Party groups, RSVP pills, diets, status counts | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitGrid`, `KitAction` | None |
| 4 | events | RSVP | Yes/no controls, plus, meal, note, send | `KitCard`, `KitContent`, `KitText`, `KitAction`, `KitInput`, `KitTrack`, `KitChip` | None |
| 4 | events | Seating | Round/long tables, initials, unseated tray | `KitCard`, `KitText`, `KitRow`, `KitChip` | `KitSeatMap` |
| 4 | events | Vendors | Supplier icons, money/due rows, call, totals | `KitCard`, `KitRow`, `KitGrid`, `KitIcon`, `KitText`, `KitAction` | None |
| 4 | events | Ticket | Perforated admission pass, holder, code | `KitContent`, `KitText`, `KitRow` | `KitTicket`, `KitCode` |
| 4 | events | Door | Scan frame, arrivals headline, manual check-in | `KitCard`, `KitViewfinder`, `KitText`, `KitInput`, `KitRow`, `KitAction` | None |
| 4 | events | Registry | Gift photo rows, claimed marks, claim/release | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitAction`, `KitTrail` | None |
| 4 | events | FindDate | Sticky people, date columns, response cells | `KitCard`, `KitText`, `KitChip` | `KitTable` |
| 4 | places | PlaceCard | Photo summary, rating, distance, open mark | `KitCard`, `KitContent`, `KitPhoto`, `KitText`, `KitScaleTrack`, `KitTrail` | None |
| 4 | places | Address | Address lines, small map, contact actions | `KitCard`, `KitContent`, `KitText`, `KitMapTile`, `KitAction` | None |
| 4 | places | Hours | Seven day/time rows, today, special notices | `KitCard`, `KitRow`, `KitTime`, `KitText`, `KitTrail` | None |
| 4 | places | DeliveryTracker | Courier/destination map, ETA, step, call | `KitCard`, `KitMapTile`, `KitContent`, `KitText`, `KitPhoto`, `KitAction` | None |
| 4 | places | MapList | Selectable pins, linked highlighted rows, view | `KitCard`, `KitMapTile`, `KitRow`, `KitText`, `KitTrack`, `KitChip` | None |
| 4 | places | Departures | Line badges, destination, live/delayed times | `KitCard`, `KitRow`, `KitTrail`, `KitText` | None |
| 4 | community | Members | Register rows, portraits, eligibility/dues badges | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTrail`, `KitAction` | None |
| 4 | community | Dues | Assessment/receipt ledger, totals, pay/void | `KitCard`, `KitRow`, `KitGrid`, `KitText`, `KitTrail`, `KitAction` | None |
| 4 | community | Vote | Ballot choices, quorum bar, aggregate decision | `KitCard`, `KitText`, `KitTrack`, `KitChip`, `KitMeter`, `KitRow`, `KitAction` | None |
| 4 | community | SignUpSheet | Counted slots, claimant rows, compact expansion | `KitCard`, `KitRow`, `KitText`, `KitAvatarStack`, `KitAction` | None |
| 4 | community | Minutes | Decision document, linked actions, checks | `KitCard`, `KitContent`, `KitRow`, `KitText`, `KitCheck`, `KitAction` | None |

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
| 5 | team | Roster | People by days, shift cells, cover marks | `KitCard`, `KitText`, `KitPhoto` | `KitTable`, `KitWeekMatrix` |
| 5 | team | Shift | Date/time card, role/place, offer/swap | `KitCard`, `KitContent`, `KitText`, `KitAction` | None |
| 5 | team | OpenShift | Open shift rows, time/pay, claim | `KitCard`, `KitRow`, `KitText`, `KitAction` | None |
| 5 | team | TimeClock | Work clock, large in/out, break controls | `KitCard`, `KitContent`, `KitText`, `KitAction`, `KitRow` | None |
| 5 | team | Timesheet | Person/day hours table, total, overtime, approve | `KitCard`, `KitText`, `KitAction` | `KitTable`, `KitWeekMatrix` |
| 5 | team | Approval | Request portraits/details, approve/decline | `KitCard`, `KitRow`, `KitPhoto`, `KitContent`, `KitText`, `KitAction` | None |
| 5 | team | Handover | Shift note rows, flags, seen ticks | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitCheck` | None |
| 5 | sports | Fixtures | Match rows/next card, initials, result pill | `KitCard`, `KitRow`, `KitContent`, `KitPhoto`, `KitText`, `KitTime`, `KitTrail` | None |
| 5 | sports | Scoreboard | Two large scores, central status/clock, keeper | `KitCard`, `KitText`, `KitAction` | `KitScore` |
| 5 | sports | Standings | Sticky teams, numeric columns, form, cut lines | `KitCard`, `KitText`, `KitRank`, `KitTrail`, `KitTrack`, `KitChip` | `KitTable` |
| 5 | sports | Lineup | Pitch lines, numbered player nodes, substitutes | `KitCard`, `KitRow`, `KitText`, `KitStrip` | `KitPitch` |
| 5 | sports | MatchFeed | Home/away events, central minute, kind icons | `KitCard`, `KitRow`, `KitGrid`, `KitTime`, `KitIcon`, `KitText`, `KitAction` | None |
| 5 | sports | Squad | Portrait rows, availability choice, coach tick | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitTrack`, `KitChip`, `KitCheck`, `KitMeter` | None |
| 5 | sports | Bracket | Sideways rounds, paired ties, winner links | `KitCard`, `KitText`, `KitRow` | `KitBracket` |
| 5 | projects | Tasks | Grouped task rows, indented children, blockers | `KitCard`, `KitRow`, `KitText`, `KitCheck`, `KitTrack`, `KitChip` | None |
| 5 | projects | Milestones | Dated gate rail/cards, missing deliverables | `KitCard`, `KitRouteStop`, `KitRow`, `KitTime`, `KitText`, `KitTrail` | None |
| 5 | projects | Gantt | Sticky task rail, date bars, diamonds, links | `KitCard`, `KitText`, `KitTrack`, `KitChip` | `KitGantt` |
| 5 | projects | TimeLog | Day groups, durations/totals, timer, remove | `KitCard`, `KitRow`, `KitTime`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | projects | Scope | Acceptance document, checks, excluded section | `KitCard`, `KitContent`, `KitRow`, `KitText`, `KitCheck`, `KitAction` | None |
| 5 | paperwork | Documents | Neutral file tiles/rows, masked id, expiry | `KitCard`, `KitRow`, `KitIcon`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | paperwork | Renewals | Notice/due rows/cards, completed ticks, reminder | `KitCard`, `KitRow`, `KitText`, `KitCheck`, `KitTrail`, `KitAction` | None |
| 5 | paperwork | Receipts | Neutral attachment tiles, amounts, review ticks | `KitCard`, `KitRow`, `KitIcon`, `KitText`, `KitCheck`, `KitAction` | None |
| 5 | paperwork | Signature | Private drawn mark, review, clear/save | `KitCard`, `KitText`, `KitCheck`, `KitAction` | `KitSignaturePad` |
| 5 | paperwork | TaxYear | Evidence category rows, progress, missing files | `KitCard`, `KitRow`, `KitText`, `KitMeter`, `KitTrail` | None |
| 5 | books | Ledger | Account groups, in/out lines, sources, export | `KitCard`, `KitRow`, `KitGrid`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | books | Expenses | Receipt/line document, coding/value controls | `KitCard`, `KitRow`, `KitPhoto`, `KitText`, `KitInput`, `KitTrack`, `KitChip`, `KitAction` | None |
| 5 | books | ProfitLoss | Statement sections, subtotal rows, tax bridge | `KitCard`, `KitContent`, `KitRow`, `KitGrid`, `KitText` | None |
| 5 | books | VatReturn | Nine numbered boxes, reconciliation, save | `KitCard`, `KitGrid`, `KitRow`, `KitRank`, `KitText`, `KitAction` | None |
| 5 | books | Payroll | Pay-run/payslip rows, deductions, totals/actions | `KitCard`, `KitContent`, `KitRow`, `KitGrid`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | invest | Holdings | Position rows, cost/value/gain, dated quotes | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | invest | Watchlist | Quote/target rows, signed gaps, remove/refresh | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | invest | Performance | Value/contribution lines, legend, point reading | `KitCard`, `KitText`, `KitTrack`, `KitChip`, `KitRow` | `KitLinePlot` |
| 5 | invest | Dividends | Dated distributions, expected/received, receive/void | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | invest | InvestmentActivity | Dated trade/cash ledger, amounts, source/void | `KitCard`, `KitRow`, `KitGrid`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | hiring | JobPost | Role/pay terms, requirements, deadline, actions | `KitCard`, `KitContent`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | hiring | ApplicantPipeline | Stage columns or stack, counts, applicant cards | `KitCard`, `KitRow`, `KitText`, `KitTrail` | `KitColumns` |
| 5 | hiring | Candidate | Portrait, criterion choices, evidence, decisions | `KitCard`, `KitPhoto`, `KitContent`, `KitRow`, `KitText`, `KitTrack`, `KitChip`, `KitInput`, `KitAction` | None |
| 5 | hiring | Interview | Meeting card/summary, people, time, join/invite | `KitCard`, `KitContent`, `KitRow`, `KitText`, `KitAvatarStack`, `KitAction` | None |
| 5 | hiring | Offer | Letter/card terms, conditions, response actions | `KitCard`, `KitContent`, `KitRow`, `KitText`, `KitTrail`, `KitAction` | None |
| 5 | hiring | Applications | Application rows/cards, next action, follow-up | `KitCard`, `KitRow`, `KitText`, `KitTrail`, `KitCheck`, `KitAction` | None |

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

## Base changes

One row per existing base. Additions are optional and retain current defaults; unrelated core drawings
stay unchanged. Labels, pending/error copy and derived domain states still come from callers/host.

| Base | Exact prop addition/change | Draws or enables | Used by | First wave |
| --- | --- | --- | --- | --- |
| `KitPhoto` | Make `photo` optional; add `initials?: string; ring?: "none" \| "accent" \| "muted"` | Caller-supplied initials when no photo; selected/unseen or seen avatar outline | booking `StaffPicker`; home `Agenda`; social `Stories`; sports `Fixtures` | 1 |
| `KitCheck` | `disabled?: boolean; readonly?: boolean` | Unavailable checkbox; static completed tick without action | customers `Agreement`; health `Workout`, `HabitGrid`; requests `WorkOrder`, `RequestResolution`; projects `Tasks`, `Scope`; paperwork `Signature` | 1 |
| `KitAction` | Extend `action` to `"press" \| "dismiss" \| "play" \| "pause" \| "toggle" \| "select" \| "check" \| "set" \| "type" \| "increment" \| "decrement" \| "start" \| "stop" \| "send" \| "scan"`; add `value?: string \| number \| boolean` | Dispatch declared non-press actions; keep existing disabled support | health `Workout`; kitchen `Ingredients`, `CookSteps`, `KitchenTimers`; home `Rewards`, `BabyLog`, `Devices`; commerce `Product`, `Cart`; mind `Soundscape`; requests `RequestThread`, `WorkOrder`; events `Door`; sports `Scoreboard`; projects `TimeLog`; hiring `Interview`, `Offer` | 2 |
| `KitInput` | `action?: "type" \| "set"; disabled?: boolean; min?: number; max?: number; step?: number` | Numeric/date set controls, bounded/disabled edits; default remains type | play `ScoreSheet`; money `Payoff`; requests `WorkOrder`; property `Units`, `Inspections`; books `Expenses`; hiring `Candidate` | 2 |
| `KitSlider` | `step?: number; disabled?: boolean` | Half-degree steps and pending/offline controls | home `Devices`; health `SymptomLog` | 2 |
| `KitTrail` | `disabled?: boolean; tone?: TextTone` | Pending switches and good/warn/bad status pills | home `Devices`; money `Bills`; commerce `ProductGrid`; property `Units`, `RentRoll`; events `GuestList`; places `Departures`; inventory `Things` | 2 |
| `KitCard` | `swatch?: Swatch` (`Swatch` is the existing catalog type) | Fixed account swatch with matching readable foreground tokens | money `AccountCard` | 2 |
| `KitTile` | `on?: boolean; disabled?: boolean; detail?: ReactNode; action?: "press" \| "toggle" \| "start" \| "stop"` | Selected/locked tiles, secondary copy, declared root action through controller (currently links only) | home `BabyLog`; mind `Factors`; learning `Achievements` | 2 |
| `KitChip` | `disabled?: boolean; swatch?: Swatch; look?: "pill" \| "segment" \| "box"` (extends `look`) | Unavailable/crossed-out variants, square size targets, fixed swatches | commerce `VariantPicker`; property `Viewings`, `Inspections` | 3 |
| `KitScaleTrack` | `single?: boolean` (only with `readonly: true`, `style: "mood"`) | One chosen mood face, not the five-face selection track | mind `Entries`, `SleepLog` | 3 |
| `KitText` | `emphasis?: "normal" \| "strong" \| "emphasis"; goto?: string; item?: string` | Inline strong/italic runs and addressed screen links | media `Article` | 4 |
| `KitRow` | `indent?: 0 \| 1; selected?: boolean; tone?: TextTone` | One-level replies/subtasks; current-row and status tint | social `Comments`; places `MapList`; projects `Tasks`; media `ChapterList`; property `Units` | 3 |
| `KitMapTile` | `pins?: readonly { id: string; label: string; x: number; y: number; selected?: boolean; mark?: "pin" \| "dot"; target?: Target }[]` | Supplied normalized pins, up to six for MapList, selected/courier markers | places `MapList`, `DeliveryTracker` | 4 |
| `KitRouteStop` | `goto?: string; mark?: "route" \| "dot" \| "check"` | Linked milestone rail with neutral dot or completed tick, not a destination pin | projects `Milestones` | 5 |

`KitRow.selected`/`tone` first serve property `Units` in wave 3; indentation waits for wave 4 replies.
`KitAction` still uses the shared controller's validation; new props do not add action names or runtime
handlers. `KitCard.swatch` supplies a surface context for child text, not a free colour prop.
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

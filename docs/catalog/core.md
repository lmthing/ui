# Core components plan

The core is the set of components every app can use and every prompt carries. It goes from **40 to 44**:
six new components, two built ones folded into others, and new options on thirteen built ones. Entry format
and tier names: [README](README.md).

## 1. Summary of changes

| Change | Components | Why |
| --- | --- | --- |
| **New** (6) | `Sheet`, `Composer`, `Progress`, `Choice`, `Amount`, `Player` | Gaps found by at least three of the four research passes that no option on a built component can close |
| **Merged** (2) | `Sparkline` → `Stats` style `trend`; `DayTimeline` → `Timeline` style `hours` | Near neighbours a model confuses; each is a different drawing of the same data |
| **Changed** (13) | `List`, `Card`, `Gallery`, `Empty`, `Timer`, `Field`, `Scale`, `Button`, `Actions`, `Success`, `People`, `Stats`, `Timeline` (`Stats` and `Timeline` take the merged ones) | Carousels, shelves, accordions, badges, toasts, ratings, countdowns, repeats and avatar stacks become options, so the model has no new ids to tell apart |
| **Kept** (25) | Everything else (`TabBar` gains code-owned count badges only) | Already covers its need with a clear `pick` |

Counted by group after the change: structure 4, content 11, data 9, input 8, action 4, beyond phone 4,
signature 3, escape 1 = **44**.

### Why these six and not more

- **`Sheet`.** Every design system, every app category and every model-facing vocabulary has a panel over
  the screen. Without one, a cheap model has no standard way to confirm "Delete this walk?", show the details
  of a row without a new screen, or offer more than four choices.
- **`Composer`.** `Field` is one line. Journals, reviews, notes, feedback and every chat reply need several
  lines, and `Bubbles` has no way to type.
- **`Progress`.** Linear bars against targets (macros, budget categories, course progress, storage) are in 10
  of 16 app categories. `Ring` is one goal; stacking rings to fake it looks wrong.
- **`Choice`.** Options that carry a sentence each (plans, quiz answers, onboarding questions, "how do you
  want to be reminded?"). `Chips` hold one word; `Field` `choice` is a compact picker inside a form.
- **`Amount`.** Money appears in commerce, money, booking, customers, trips, events and inventory. Built once
  here, it formats currency, period and change the same way everywhere, and no pack has to depend on another.
- **`Player`.** Media, mind (meditation), learning (lessons) and health (exercise videos) all play audio or
  video. A pack never depends on another pack, so a component four packs need belongs in the core.

### Considered and left out

| Candidate | Where the need goes instead |
| --- | --- |
| In-page tabs | `Segmented` already switches 2 to 4 views of the same screen |
| Table | `data` pack (`Table`); on a phone `List` and `KeyValue` cover most uses |
| Avatar, avatar group | `Profile`, and `People` style `stack` |
| Badge | `List` trail `badge` (built), new `badge` on `Card`, counts on `TabBar` from code |
| Toast, snackbar | `Success` style `toast` |
| Accordion, FAQ | `List` style `expand` |
| Carousel | `List` style `shelf` (cards), `Gallery` style `carousel` (photos) |
| Rating display | `Scale` with `readonly` |
| Overflow menu | `Actions` style `menu` inside a `Sheet`, opened from the `Header` action |
| Countdown to a date | `Timer` style `until` |
| Repeat or reminder picker | `Field` kind `repeat` |
| Error with retry, offline | `Empty` kind `error` and `offline` |
| Onboarding, paywall | Archetypes (`onboarding`, new `plans`) built from `Hero`, `Steps`, `Choice`, `Button` |
| Filter bar with sort | `Chips` in the core; `FilterBar` in the `data` pack |
| Divider, spacer, layout grids | The screen's rhythm table (plan 5.6) owns spacing |
| Floating add button | `Button` (one primary per screen, bottom region) |
| Spinner, skeleton | The kit draws `loading` for every component; never written by a model |
| PIN or code entry, colour picker, signature pad | Rare outside one domain; `Canvas` until misses ask |

## 2. New components

### `Sheet` · new · action · phone

A panel that rises from the bottom over the current screen, dims what is behind it, and closes by a swipe
down, a tap outside or its cancel action. It is the only component that is not part of the screen's flow:
it lives in the new `overlay` region, at most one per screen, hidden until something opens it.

- **Pick:** confirm a step that cannot be undone, show more about one item without leaving the screen, or
  pick from more than four options. Not a message that stays on the screen (`Banner`), not a whole new task
  (a new screen through `goto`), not 2 to 4 options shown inline (`Choice` or `Chips`).
- **Writes:** `title` text(40), `body` text(140) optional, `style`, and for `confirm` a `confirm` label
  text(20) and `tone` (`neutral` or `bad`); for `detail` `pairs` of label text(16) and value text(28), 1–6;
  for `picker` `options` of label text(28), meta text(36) optional and icon optional, 2–8, with `at`.
- **Styles:** `confirm` (title, body, a confirm button in `tone` and a cancel button), `detail` (title,
  facts, one optional `Button`-like action with `goto`), `picker` (a list of options, the chosen one ticked).
- **Parts → actions:** `confirm press`, `cancel dismiss`, root `dismiss`; picker items `root select`;
  detail `action press`.
- **Opening it:** any `goto` may name `sheet` instead of a screen id (`Header` action, `Button`, a `List`
  row, a `Card`). A flow step can open it too. A `Button` with `confirm` text opens a standard confirm sheet
  drawn by the kit, so most confirmations cost no model line at all (see `Button`).
- **States:** filled.
- **Real path:** a local overlay on the current screen; the confirm action runs the same on-device action
  the trigger would have run.
- **Aliases:** modal, dialog, popup, bottomsheet, alert, confirm.
- **Kit work:** new base `KitSheet` (grabber, title, content slot, safe area, `sheet` elevation, spring
  `gentle`), `overlay` region in `Screen`, focus trap and the `dismiss` action in the interaction store.
  Reads print it under the screen only while open: `s1 Sheet[confirm] "Delete this walk?" (open)`.

### `Composer` · new · input · phone

A text box that grows to several lines for writing in full sentences. As an entry it fills the width with a
soft border and a quiet character count; as a reply it sits at the bottom of a conversation with a send
button that is disabled while the box is empty.

- **Pick:** writing more than one line: a journal entry, a review, a note, a message or a reply. Not one
  short value on a form (`Field` kind `text`), not finding something by name (`Search`).
- **Writes:** `label` text(24) optional, `hint` text(48) (placeholder), `value` text(600) optional, `style`,
  `max` 80–2000 (character limit shown as the count, default 600), `goto` optional (where send leads).
- **Styles:** `entry` (multi-line box in the body), `reply` (one line that grows to four, with send; bottom
  region; pairs with `Bubbles` or `Comments`).
- **Parts → actions:** `field type` (text), `send send` (reply only).
- **States:** filled, empty (shows the hint), success (reply: the sent text joins the conversation).
- **Real path:** the text is saved to one record on the device; a reply is delivered through the same
  service as the `Bubbles` it answers.
- **Aliases:** textarea, editor, journal entry, message box, reply, multiline.
- **Kit work:** `KitTextArea` (grows with content, keyboard-safe, role textbox multiline), `KitSend` icon
  button; copy for the count (`charLine(n, max)`) and the send label.

### `Progress` · new · data · phone

One to five labelled bars, each filled toward its own target, with the amount and target written beside it.
A bar past its target turns `warn` or `good` depending on what the target means.

- **Pick:** progress toward several targets at once (calories, protein, carbs; spent against budget per
  category; lessons done per course), or one goal shown as a slim bar inside a list of things. Not one main
  goal in the middle of the screen (`Ring`), not amounts compared with each other with no targets (`Bars`),
  not place in a sequence of steps (`Steps`).
- **Writes:** `bars` of `label` text(20), `value` number, `of` number, `unit` text(8) optional, `over`
  (`warn` default, `good`, `bad`: the tone when value passes of), 1–5; `style`.
- **Styles:** `stack` (label left, amount right, a full-width bar under each), `compact` (label and bar on
  one line, for inside a card or under a hero).
- **Parts → actions:** items `root` (read-only; `press` when the bar has `goto`).
- **States:** filled, empty, loading.
- **Real path:** amounts summed from records on the device, each compared with a target stored there.
- **Aliases:** progressbar, meter, macros, budget bars, gauge.
- **Read:** `"Protein" 62 of 120 g · "Carbs" 180 of 200 g`.
- **Kit work:** `KitProgressBar` (track `$line`, fill `$accent` or tone, value/of clamp, rounded by
  preset); a `progress` skeleton shape.

### `Choice` · new · input · phone

Two to five options stacked as large tappable cards, each with a title, a sentence under it, an optional
icon and an optional value on the right (a price, a duration). The chosen card takes an accent border and a
tick. With `multi`, several can be chosen.

- **Pick:** choosing among a few options that each need a sentence to explain: a plan, an answer to a
  question, a way of doing something, an onboarding question. Not a few one-word options (`Chips`), not a
  value inside a form (`Field` kind `choice`), not switching views of the same screen (`Segmented`), not
  keep-or-skip one at a time (`SwipeStack`).
- **Writes:** `question` text(60) optional, `options` of `title` text(28), `sub` text(80) optional, `icon`
  optional, `value` text(16) optional, `badge` text(12) optional (for example "Most popular"), 2–5; `at`
  (selected index) optional; `multi` boolean (default false).
- **Styles:** `cards` (default), `list` (rows with a radio or check on the left, for longer questions).
- **Parts → actions:** items `root select` (with `multi`, `toggle`).
- **States:** filled, success (the chosen option confirmed, for quizzes and flows).
- **Real path:** the chosen option is stored on one record on the device.
- **Aliases:** options, plans, radio, multiple choice, pricing, picker.
- **Kit work:** `KitOption` (card or row, selected ring, badge corner, `role` radio or checkbox).

### `Amount` · new · data · phone

One sum of money written properly: currency symbol in the right place for the locale, tabular digits,
an optional period ("/ month"), an optional old price struck through, and an optional change with an arrow
in `good` or `bad`.

- **Pick:** money is the point: a balance, a price, a total, what is owed. Not two to four numbers that are
  not all money (`Stats`), not the one headline message of the screen in words (`Hero`), not a price inside
  a list of items (`List` trail `value`).
- **Writes:** `label` text(24) optional, `value` number, `currency` (ISO 4217 code, default from the app's
  locale), `per` (`none` default, `hour`, `day`, `night`, `week`, `month`, `year`, `each`, `person`), `was`
  number optional, `change` number optional (signed, in the same currency or percent with `changeIn`),
  `changeIn` (`money` default, `percent`), `sub` text(40) optional, `style`.
- **Styles:** `large` (display size, centred, the screen's headline number), `inline` (label left, amount
  right, in a card or under a title), `total` (a rule above, label "Total" from copy unless `label` given).
- **Parts → actions:** root (read-only; `press` with `goto`).
- **States:** filled, loading.
- **Real path:** a sum computed on the device from stored records; no money moves (paying is a pack
  component with tier `service`).
- **Aliases:** price, balance, total, money, cost, sum.
- **Read:** `"Balance" €1,240.50 · down €32 this week`.
- **Kit work:** `moneyLine(value, currency, per)` in `catalog/copy.ts` using `Intl.NumberFormat`; no kit
  base beyond `KitText role="number"` with `tabular`.
- **Rule:** at most one `Amount` style `large` per screen, and never together with `Hero` style `number`.

### `Player` · new · content · phone

Plays one piece of audio or video: artwork or the video frame, title and source, a scrubber with elapsed
and remaining time, play and pause, and skip back and forward by 15 seconds. In `audio` style the artwork is
square and the controls large; `video` shows a 16:9 frame with controls over it; `compact` is one row.

- **Pick:** listening to or watching one recording now: a meditation, a lesson, an episode, a workout video,
  a voice memo. Not a list of recordings to choose from (`List`, or `Playlist` in the media pack), not a
  photo (`Photo`), not a countdown for an activity with no recording (`Timer`).
- **Writes:** `title` text(40), `sub` text(40) optional (artist, teacher, show), `photo` optional
  (artwork), `seconds` 1–36000 (length), `at` seconds optional (where it resumes), `kind` (`audio`,
  `video`), `style`.
- **Styles:** `audio` (default for audio), `video` (default for video), `compact`.
- **Parts → actions:** `play play`, `play pause`, `scrubber seek`, `back press`, `forward press`.
- **States:** filled, loading.
- **Real path:** a file stored on or bundled with the app, played by the device's media player.
- **Aliases:** audio, video, podcast player, media, playback, now playing.
- **Read:** `"Evening wind-down" · 4:05 of 12:00 · paused`.
- **Kit work:** `KitScrubber` (role slider, `clockLine` labels), `KitMediaControls`, a media adapter behind
  the host interface (plan 5.3) so the kit never imports a player library directly.

## 3. Merged components

Both merges keep the drawing and the signature; only the id goes away. Each is gated by evidence: merge only
if the pair's near-miss `choose` probes are unstable on a required model, or if the Critic logs the pair as a
repeated wrong pick. If both stay stable, keep both ids and mark this section done without merging.

| Old id | Becomes | Props mapping | Migration |
| --- | --- | --- | --- |
| `Sparkline` | `Stats` style `trend` | one tile: `label`, `value`, `points` (up to 12), `tone` | `migrations/` rewrites old lines; alias `sparkline` → `Stats`; recordings retire with a commit note |
| `DayTimeline` | `Timeline` style `hours` | `blocks` of time and title become `items` with `time`, `end`, `title`, `tone`, `goto` | Same; signature `day_unfold` moves to `Timeline[hours]`; alias `day timeline`, `schedule` → `Timeline` |

## 4. The full core

### Structure (4)

### `Header` · built · structure · phone
The screen's name at the top, in a large title that shrinks on scroll, an inline title, or a back arrow with
a title. At most one corner action (an icon or a short word).
- Pick: every screen that needs a name. Not the label of one group inside the screen (`SectionTitle`).
- Writes: `title` text(28), `sub` text(40) optional, `action` (icon, label, `goto`) optional.
- Styles: `large`, `inline`, `back`. · States: filled.
- Parts → actions: `back press`, `action press` (may open the screen's `sheet`).
- Real path: the screen's title and links in the app. · Aliases: title, navbar, appbar, top bar.

### `SectionTitle` · built · structure · phone
A small heading above a group of content, with one optional link on the right ("See all").
- Pick: label a group so the screen scans. Not the screen's name (`Header`).
- Writes: `text` text(28), `link` (label, `goto`) optional. · States: filled.
- Parts → actions: `link press`. · Aliases: subheading, group label, section.

### `Steps` · built · structure · phone
Where the person is in a short sequence: dots, a segmented bar or numbered circles.
- Pick: a flow of 2 to 6 screens (sign-up, a recipe, a checkout). Not progress toward an amount
  (`Progress`, `Ring`).
- Writes: `count` 2–6, `at`. · Styles: `dots`, `bar`, `numbered`. · States: filled.
- Aliases: stepper, wizard, pagination dots.

### `TabBar` · built · structure · phone · code-owned
Bottom navigation with 2 to 5 tabs. Built by code from sections marked `nav`; never written by a model.
- Changes: tabs may show a count badge from code (unread, items due), never from the model.
- Parts → actions: items `root press`. · Aliases: tabs, bottom nav, navigation.

### Content (11)

### `Hero` · built · content · phone
The one thing this screen says, as a large statement, a full-bleed photo with a title over it, or a big
number with a caption.
- Pick: one headline fact or message. Not money as the headline (`Amount` style `large`), not several
  numbers (`Stats`), not something to notice now (`Banner`).
- Writes: `title` text(40), `sub` text(60) optional, `photo` optional, `tone`.
- Styles: `statement`, `photo`, `number`. · States: filled, loading. · Aliases: headline, banner image, jumbotron.

### `Card` · changed · content · phone
One thing with a little detail: title, a line of body, meta, an icon or photo, optionally tappable as a
whole.
- Pick: one featured thing to open. Not several things of a kind (`List`), not facts about one thing
  (`KeyValue`).
- Writes: `title` text(28), `body` text(80) optional, `meta` text(24) optional, `icon` or `photo`, `goto`,
  `tone`, **new** `badge` text(12) optional (a status pill in the top corner: "Paid", "Due today", "New").
- Styles: `plain`, `tinted`, `outlined`, `media`. · States: filled, loading.
- Parts → actions: `root press`. · Aliases: tile, panel, item card.

### `List` · changed · content · phone
Several things of one kind as rows (title, meta, icon or photo, a trail such as a chevron, check, switch,
value or badge), each tappable.
- Pick: several things of one kind to scan and tap. Not one featured thing (`Card`), facts about one thing
  (`KeyValue`), jobs to tick off (`Checklist`).
- Writes: `rows` of `title` text(28), `meta` text(36), `icon`, `photo`, `trail`, `value` text(10), `goto`,
  1–6; **new** `body` text(200) per row (style `expand` only).
- Styles: `plain`, `inset`, `cards`, **new** `shelf` (a titled sideways rail of photo cards, 2–8 rows,
  the next card peeking; for "Popular", "Continue", "Near you"), **new** `expand` (each row opens in place
  to show its `body`: FAQs, instructions, details).
- Parts → actions: items `root press` (`toggle` in `expand`), `trail toggle`.
- States: filled, empty, loading. · Aliases: listview, table, rows, items, feed, carousel, accordion, faq.

### `KeyValue` · built · content · phone
Labelled facts about one thing in rows or a two-column grid.
- Pick: details of one thing (its room, schedule, size). Not money as the point (`Amount`).
- Writes: `pairs` of label text(16), value text(28), 1–6. · Styles: `rows`, `grid`.
- States: filled, empty, loading. · Aliases: details, properties, specs, info.

### `Note` · built · content · phone
One short sentence of supporting information, as body text, a quote or a hint with an icon.
- Pick: one sentence that helps. Not something urgent to notice (`Banner`), not writing by the person
  (`Composer`).
- Writes: `text` text(120), `tone`. · Styles: `body`, `quote`, `hint`. · Aliases: caption, tip, hint, quote.

### `Photo` · built · content · phone
One picture, square, wide or tall, with an optional caption.
- Pick: one picture matters. Not several (`Gallery`), not a recording (`Player`).
- Writes: `photo`, `caption` text(60), `ratio`. · Styles: `square`, `wide`, `tall`. · States: filled, loading.

### `Gallery` · changed · content · phone
Several pictures as a grid, a sideways strip, or a full-width carousel.
- Pick: several pictures together. Not one picture (`Photo`), not cards with titles (`List` style `shelf`).
- Writes: `photos` (photo, caption, `goto`), 2–6 (carousel up to 8).
- Styles: `grid`, `strip`, **new** `carousel` (full width, one at a time, page dots; product, listing and
  place photos).
- Parts → actions: items `root press`. · States: filled, empty, loading. · Aliases: photos, grid, album, slideshow.

### `Profile` · built · content · phone
Who or what this screen is about: a photo or avatar, a name and a meta line, as a row or centred.
- Pick: the identity of a person, pet, plant or thing. Not other people involved (`People`).
- Writes: `name` text(28), `meta` text(40), `photo`. · Styles: `row`, `centered`. · States: filled, loading.

### `Banner` · built · content · phone
A tinted strip near the top with an icon and a sentence that needs attention now, optionally tappable.
- Pick: something to notice now (overdue, offline, a change). Not a sentence of help (`Note`), not a
  confirmation before acting (`Sheet`).
- Writes: `text` text(80), `icon`, `tone` (default `warn`), `goto`. · Aliases: alert, notice, warning, callout.

### `Empty` · changed · content · phone
A calm, centred message on a screen with nothing in it yet, with an icon badge and an optional next step.
- Pick: there is no content yet, or loading it failed. Not a sentence beside content (`Note`).
- Writes: `title` text(32), `sub` text(80), `icon`, **new** `kind` (`none` default, `error` with a retry
  action, `offline`), **new** `goto` for the next step.
- Parts → actions: **new** `retry press` (error, offline). · Aliases: empty state, placeholder, error, offline.

### `Player` · new · content · phone
See section 2.

### Data (9)

### `Stats` · changed · data · phone
Two to four numbers as tiles or one inline row, each with a label, unit and an optional trend arrow.
- Pick: a few summary numbers. Not money as the point (`Amount`), not one goal (`Ring`), not targets per
  category (`Progress`).
- Writes: `tiles` of label text(16), value, unit text(6), trend, 2–4; **new** `points` (up to 12) per tile
  in style `trend`.
- Styles: `tiles`, `inline`, **new** `trend` (1–2 tiles, each with a small line of recent values under the
  number; replaces `Sparkline`).
- States: filled, empty, loading. · Signature: `count_up`. · Aliases: kpi, metrics, numbers, sparkline, trend.

### `Ring` · built · data · phone
A ring filling toward one goal with the amount written inside.
- Pick: how far toward one main goal. Not several targets (`Progress`), not a sequence (`Steps`).
- Writes: `value`, `of`, `label` text(20), `sub` text(28). · Styles: `md`, `lg`. · States: filled, loading.
- Signature: `ring_fill`. · Aliases: goal, progress ring, donut progress.

### `Bars` · built · data · phone
Up to seven columns comparing amounts across days or categories, the largest in accent, values under each.
- Pick: compare amounts with each other. Not progress toward targets (`Progress`), not a trend line
  (`Stats` style `trend`).
- Writes: `points` (label, value), 2–7, `unit`. · States: filled, empty, loading. · Signature: `bars_grow`.
- Parts → actions: items `root` (read). · Aliases: bar chart, histogram, columns.

### `Progress` · new · data · phone
See section 2.

### `Amount` · new · data · phone
See section 2.

### `Timeline` · changed · data · phone
Things in time order as a vertical list with a time column, as a day plan, a history, or blocks on an hour
rail.
- Pick: when things happen, in order. Not which days have something (`Calendar`), not things to tick off
  (`Checklist`).
- Writes: `items` of time, title text(28), meta text(36), done, 1–6; **new** `end` and `tone` per item in
  style `hours`.
- Styles: `day`, `history`, **new** `hours` (blocks placed and sized on an hour rail so gaps show; replaces
  `DayTimeline`). · States: filled, empty, loading. · Signature: `day_unfold` (on `hours`).
- Aliases: schedule, agenda, history, log, day timeline, itinerary.

### `Calendar` · built · data · phone
A week strip or a month grid with marked days in a tone and one selected day.
- Pick: which days have something, and opening a day. Not what happens within a day (`Timeline`).
- Writes: `marked` (date, tone), `selected`. · Styles: `week`, `month`.
- Parts → actions: items `root select`. · Signature: `calendar_sweep`. · Aliases: date picker, month view, week view.

### `Counter` · built · data · phone
One number nudged up or down by a fixed step with large minus and plus buttons.
- Pick: keep one running count (glasses of water, laps). Not a quantity in a cart (commerce `Quantity`).
- Writes: `label`, `value`, `unit`, `step`. · Parts → actions: `decrement`, `increment`, `value set`.

### `Timer` · changed · data · phone
A large clock counting down or up, with start and stop.
- Pick: time an activity now, or count down to a date. Not a recording to play (`Player`).
- Writes: `label` text(24), `seconds`; **new** `until` (date `YYYY-MM-DD`, optional time) in style `until`.
- Styles: `down`, `up`, **new** `until` (days, hours and minutes left to a date: a trip, a wedding, a
  deadline; no start or stop). · Parts → actions: `start`, `stop` (not in `until`). · Signature: `timer_spin`.
- Aliases: stopwatch, countdown, clock.

### Input (8)

### `Field` · changed · input · phone
One labelled piece of information: text, number, date, time, a choice, a toggle, a slider or a photo.
- Pick: one value on a form. Not several lines of writing (`Composer`), not options that need a sentence
  each (`Choice`).
- Writes: `label` text(24), `kind`, `value`, `hint` text(48), `options` (choice only); **new** kind
  `repeat` (value `never`, `daily`, `weekdays`, `weekly`, `monthly`, `yearly`) for reminders, chores,
  medication and care schedules.
- Parts → actions: `field type` / `select` / `toggle` / `set` / `press` (photo) by kind.
- Tier: `photo` needs the person's OK. · Aliases: input, textbox, form field, picker, switch, repeat.

### `Chips` · built · input · phone
A wrapping row of up to six short pills to filter or pick one.
- Pick: filter or pick among a few one-word options. Not options needing a sentence (`Choice`), not
  switching views (`Segmented`).
- Writes: `items` (label text(16), on), 2–6. · Styles: `filter`, `choose`.
- Parts → actions: items `root toggle` / `select`. · Aliases: tags, filters, pills.

### `Segmented` · built · input · phone
A tinted track of 2 to 4 equal segments that switches between views of the same screen.
- Pick: switch between views (Day, Week, Month). Not filtering a list (`Chips`).
- Writes: `options` text(12) each, `at`. · Parts → actions: `root select`. · Aliases: tabs, toggle group, switcher.

### `Checklist` · built · input · phone
Up to six jobs with tick boxes; ticking one strikes it through.
- Pick: things to do and tick off. Not things to scan and open (`List`), not quiz answers (`Choice`).
- Writes: `items` (text text(40), done), 1–6. · Parts → actions: items `check check`.
- States: filled, empty, loading. · Signature: `check_burst`. · Aliases: todo, tasks, to-do list.

### `Search` · built · input · phone
A search box with a magnifier and a hint.
- Pick: find one thing among many by name. Not writing text (`Composer`).
- Writes: `hint` text(32). · Parts → actions: `field type`. · Aliases: find, search bar, lookup.

### `Scale` · changed · input · phone
Five faces, stars or dots to log a level from one to five, or to show a rating.
- Pick: log a level or feeling 1 to 5, or show how something is rated. Not a number with units (`Counter`,
  `Field` kind `slider`).
- Writes: `label` text(24), `value`; **new** `readonly` (boolean): value 0–5 in halves, with **new**
  `meta` text(24) ("4.6 · 212 reviews").
- Styles: `mood`, `stars`, `dots`. · Parts → actions: `l1`…`l5 set` (none when `readonly`).
- Aliases: rating, stars, mood, score.

### `Choice` · new · input · phone
See section 2.

### `Composer` · new · input · phone
See section 2.

### Action (4)

### `Button` · changed · action · phone
The one thing to do next, as a full-width button (`primary` at most once per screen) or a quieter one.
- Pick: the main thing the person does. Not 2 to 4 shortcuts (`Actions`).
- Writes: `label` text(24), `kind`, `icon`, `goto` (a screen id or `sheet`); **new** `confirm` text(60)
  optional: pressing opens a standard confirm sheet with this sentence, drawn by the kit (required for
  `kind: danger`).
- Kinds: `primary`, `secondary`, `quiet`, `danger`. · Parts → actions: `root press`.
- Aliases: cta, action, submit.

### `Actions` · changed · action · phone
Two to four shortcuts as icon tiles, or a vertical menu of up to six actions.
- Pick: a few different things the person can do next. Not the one main thing (`Button`).
- Writes: `items` (icon, label text(16), `goto`), 2–4 (menu up to 6). · Styles: `tiles` (default), **new**
  `menu` (rows with icon and label; inside a `Sheet` or as a "More" list).
- Parts → actions: items `root press`. · Aliases: shortcuts, quick actions, menu, overflow.

### `Success` · changed · action · phone
Proof something worked: a large tick, a title and a line; or a toast at the bottom for two seconds with
an optional undo.
- Pick: confirm an action worked. Not news to notice later (`Banner`).
- Writes: `title` text(32), `sub` text(80), `icon`; **new** `undo` boolean (toast only).
- Styles: `screen` (default), **new** `toast`. · Parts → actions: **new** `undo press`, `root dismiss`.
- Aliases: done, confirmation, toast, snackbar.

### `Sheet` · new · action · phone
See section 2.

### Beyond phone (4)

### `Camera` · built · beyond · ok
A dark viewfinder with a hint and a shutter, for a photo or a scan.
- Pick: point the camera at something. Not choosing an existing photo (`Field` kind `photo`).
- Writes: `hint` text(40), `kind` (`photo`, `scan`). · Parts → actions: `shutter press`.

### `MapPins` · built · beyond · service
A stylised map with up to five numbered pins and the places listed under it.
- Pick: where a few places are. Not the path between them (`Route`).
- Writes: `pins` (label text(24), meta, `goto`), 1–5. · States: filled, loading.

### `Bubbles` · built · beyond · people
A conversation as chat bubbles, mine on the right in accent, theirs on the left.
- Pick: a conversation between people. Not comments under a post (social `Comments`).
- Writes: `messages` (from `me`/`them`, text text(120)), 1–6. · States: filled, empty.
- Changes: pairs with `Composer` style `reply` under it.

### `People` · changed · beyond · people
Who else is part of this, as rows with avatar, name and role, or as an overlapping stack.
- Pick: other people involved. Not the one person this screen is about (`Profile`).
- Writes: `members` (name text(24), role text(20), photo), 1–6; **new** `more` number (shown as "+3").
- Styles: `rows` (default), **new** `stack` (overlapping avatars with a count: assignees, attendees,
  shared with). · States: filled, empty.

### Signature (3)

### `SwipeStack` · built · content · phone
A stack of cards; the top one swipes right to keep and left to skip.
- Pick: decide on things one at a time. Not choosing among options side by side (`Choice`).
- Writes: `cards` (title, photo, meta), 2–8. · Parts → actions: items `root swipe`. · Signature: `card_swipe`.

### `Streak` · built · data · phone
Days in a row, as a big count with this week's days marked.
- Pick: a habit kept day after day. Not a count with no days (`Counter`).
- Writes: `count`, `days` (7 booleans). · Signature: `streak_flame`.

### `Route` · built · data · service
A path drawn through stops from start to end with distance and time.
- Pick: a journey through stops. Not places without a path (`MapPins`).
- Writes: `stops` (label text(24)), 2–6. · Signature: `route_draw`.

### Escape (1)

### `Canvas` · built · escape · phone
A framed area for an idea the library cannot express (a game, a drawing tool), with a caption. Every use is
logged as a miss and feeds the catalog review.
- Writes: `caption` text(60).

## 5. Archetypes

Fifteen built archetypes stay. Three change their recipe, two are new.

| Archetype | Change | Recipe |
| --- | --- | --- |
| `chat` | Uses `Composer` | Header, Bubbles, Composer[reply] |
| `journal` | New layout `write` | `entries`: Header, Card, Button · `write`: Header, Field[date], Scale[mood], Composer[entry], Button |
| `onboarding` | May ask a question | Hero, Note, Steps, Choice \| Button |
| `plans` | **New**: pricing and upgrade | Header, Hero, Choice (with `value`), Note, Button |
| `browse` | **New**: shelves to explore | Header, Search, Chips, List[shelf], List[shelf] |

## 6. Screen rules added

- At most one `Sheet` per screen, region `overlay`; it is never the only content, and something on the
  screen must open it (a `goto: sheet`), unless a flow step does.
- At most one `Choice`, one `Player` and one `Composer` per screen. `Composer[reply]` sits in the bottom
  region, after `Bubbles` or `Comments`.
- At most one `Amount[large]` per screen, never together with `Hero[number]`.
- `Button` with `kind: danger` must have `confirm` (the repair fills it from copy).
- `Progress` holds at most five bars; a sixth target means a second screen or a `List`.

## 7. Build order

| Step | Builds | Gate |
| --- | --- | --- |
| C1, options (1 week) | `Field` repeat, `Timer` until, `Scale` readonly, `People` stack, `Gallery` carousel, `List` shelf and expand, `Card` badge, `Success` toast, `Empty` kinds, `Actions` menu, `Stats` trend points, `Timeline` hours | Each changed component re-passes `pnpm llm:check --component <Id>` with probes for the new option; examples cover every new value |
| C2, simple new (1.5 weeks) | `Progress`, `Amount`, `Choice`, `Composer` with `KitProgressBar`, `moneyLine`, `KitOption`, `KitTextArea` | Gate per component; near-miss probes against `Ring`, `Stats`, `Chips`, `Field` pass |
| C3, overlays and media (1.5 weeks) | `Sheet` with the `overlay` region, `dismiss`, `Button` confirm; `Player` with the media host adapter and `play`/`pause`/`seek` | Agent end-to-end: open, confirm and dismiss a sheet through `window.__lmthingUI.act`; play and seek a fixture recording |
| C4, merges (0.5 week) | `Sparkline` and `DayTimeline` folded, if section 3's evidence says so | Migrations rewrite every fixture; no recording refers to the old ids |

New copy for `catalog/copy.ts`: send, cancel, confirm, undo, retry, offline, "See all", `moneyLine`,
`charLine`, period words (per night, per month), `moreLine(n)` ("+3"), `leftLine` ("3 days left").

## 8. Open questions, with the default to build

- **Does `Sheet` break flat screens?** Default: no. It holds its own items, never other components, and
  reads as one line while open.
- **Should `Player` stream?** Default: files on the device only (tier `phone`). Streaming adds tier
  `service` through the media pack.
- **Merges now or later?** Default: later, decided by section 3's evidence.
- **Is 44 too many for the cheapest model?** Default: no, because overlap is what hurts. Re-measure with the
  choose probes after C2: if any near miss turns unstable, fix the `pick` lines before adding anything else.

# Core components plan

The core is the set of components every app can use. The catalog also includes two newer entries
not described below, `FileList` and `PassCard`. The standalone `Ring` has been folded into
`Progress[ring]`, and `DayTimeline` into `Timeline[hours]`; `Sparkline` stays separate. `TabBar` is
code-owned and stays out of choose and write prompts. Entry format and tier names: [README](README.md).
Built behavior follows `packages/ui/src/components/*.tsx` as of 2026-11-18; the files win if they change.

## Status

Built on 2026-11-18: **45** core component schemas/views, live control state, navigation count badges,
screen validation rules, and **17 archetypes with 35 validated layouts**. `DayTimeline` is folded into
`Timeline[hours]` with a three-point style weight, stable component ids, legacy aliases and a JSON Lines
migration. The recorded near-miss showed the pair becoming unstable; `Sparkline` stays separate.

The shared runtime handles text and recurrence fields, choices, switches, checklists, counters, timers,
calendars, tabs, filters, expanding rows, swipes, replies, sheets, confirmation and local media. Hosts can
persist its snapshots or supply a shared interaction store. Browser tests cover taps, keyboard controls
and `act()`.

Native host hooks provide keyboard height, safe-area insets, reduced-motion preferences, modal/back
handling and focused-input scrolling. Native device acceptance is **not verified**: no iOS/Android host
or device setup is available in this session. Composition, browser motion and affected component visual gates pass.

There is no hard file-size limit. Lint warns above 400 lines per file; functions remain limited to 60 lines.
Keep a component's definition and view together and split code by responsibility, not line count.

### Remaining core work

- `Bars[share]`: pending icons, legend presses and largest-first order. Shares and totals are built.
- `Composer`: pending empty/sent state treatments. Empty send is disabled; sending clears the box,
  appends to `Bubbles` and calls the host's `onSend`.
- `Success[toast]`: pending bottom placement and timed expiry. Close and undo already dismiss locally.
- `Player`: pending video controls over the frame, a one-row compact layout and a paused/playing read mark.
- `Hero[photo]`: pending title over the photo; it currently follows the photo.
- `Card`: pending corner badge placement; the badge currently sits in the content.
- `Amount`: pending change arrow; signed change text and its tone are built.
- `Field[photo]`: pending the `needs your OK` tier and `!needs-ok` read mark; it currently reads as `phone`.

### C3 runtime

`PhoneScreen` now mounts pinned top and bottom regions, a scrolling body, and an overlay. `goto: sheet`
opens the screen's single sheet; picker selection stays visible until dismissal, while a menu action
closes the sheet. The public agent access is `window.__lmthingUI`, with the same dispatcher used by taps.
A standard confirmation exposes `confirm/confirm press` and `confirm/cancel dismiss`; background controls
are unavailable while a sheet or confirmation is open. The overlay contains keyboard focus, supports
Escape and backdrop dismissal, and restores focus to its opener.

A host supplies `resolveMedia` for browser recordings, or a `MediaAdapter` for its device player.
Playback, pause, fifteen-second skips, and seeking update the reading and the controls. The adapter is
released when the screen leaves. The gallery's `?runtime=1` page provides a local WAV fixture.
`test/runtime.test.ts` exercises these paths in Chrome through taps and `window.__lmthingUI.act`.

### Verification and remaining acceptance

- Core component probes: the live 45-component run passes every required majority gate. Some samples remain unstable, recorded rather than retried for luck.
- Merge evidence: `docs/catalog/core-merge-evidence.json`. `DayTimeline`/`Timeline` had a 2/3 near miss and was merged. `Sparkline` cases were 3/3. The extra Stats-arrow case consistently chose Bars; that is an out-of-pair classification conflict, not evidence to remove Sparkline.
- Rule, archetype default, migration, state and browser regression tests pass. The standard project check passes 2,372 tests, including real composition replay and browser motion acceptance.
- All 35 current compose/rubric gates pass. Failed samples were addressed with precise layout guidance, actual tracker/settings data, grouped defaults and connected save instructions. Some probes pass 2/3; those samples remain recorded rather than being retried for luck.
- iOS/Android acceptance remains pending a real host/device setup. Browser contract checks cannot establish native rendering or performance.

## 1. Summary of changes

| Change | Components | Why |
| --- | --- | --- |
| **Added, built** (6) | `Sheet`, `Composer`, `Progress`, `Choice`, `Amount`, `Player` | Gaps no option on a built component can close; pending details are marked in each entry |
| **Merged** (1 retired id) | `DayTimeline` → `Timeline` style `hours` | The recorded near miss was unstable; section 3 records the mapping |
| **Merged** (1 retired id) | `Ring` → `Progress` style `ring` | A single circular goal shares the same amount and target contract as horizontal bars |
| **Built options** (12) | `List`, `Card`, `Gallery`, `Empty`, `Timer`, `Field`, `Scale`, `Button`, `Success`, `People`, `Timeline`, `Bars` | Shelves, accordions, leaderboards, shares, carousels, badges, toasts, ratings, countdowns, repeats, stacks and confirmations; pending details stay in the spec |
| **Kept** (27) | Everything else, including `Stats` and `Sparkline` (`TabBar` gains code-owned count badges) | Already covers its need with a clear `pick`; the Sparkline merge gate said retain |

**Sections and groups.** The headings in section 4 follow the plan's table (4.4): structure 4, content 11,
data 9, input 8, action 4, beyond phone 4, signature 3, escape 1 = **44**. Each entry's header gives the
`meta.group` from the code, which differs for beyond-phone and signature components (`MapPins` is group
`data`, `Bubbles` is `content`, and so on).

### Why these six and not more

- **`Sheet`.** Every design system, every app category and every model-facing vocabulary has a panel over
  the screen. Without one, a cheap model has no standard way to show a row's details without a new screen,
  offer more than five choices, or list "more" actions behind the header.
- **`Composer`.** `Field` is one line (`value` text(40)). Journals, reviews, notes, feedback and every chat
  reply need several lines, and `Bubbles` has no way to type.
- **`Progress`.** Linear bars against targets (macros, budget categories, course progress, storage) are in 10
  of 16 app categories. `Progress[ring]` is one goal; stacking rings to fake it looks wrong.
- **`Choice`.** Options that carry a sentence each (plans, quiz answers, onboarding questions, "how do you
  want to be reminded?"). `Chips` hold text(16); `Field` `choice` is 2 to 4 short options inside a form.
- **`Amount`.** Money appears in commerce, money, booking, customers, trips, events and inventory. Built once
  here, it formats currency, period and change the same way everywhere, and no pack depends on another.
- **`Player`.** Media, mind (meditation), learning (lessons) and health (exercise videos) all play audio or
  video. A pack never depends on another pack, so a component four packs need belongs in the core.

### Considered and left out

| Candidate | Where the need goes instead |
| --- | --- |
| In-page tabs | `Segmented` already switches 2 to 4 views of the same screen |
| Table | `data` pack (`Table`); on a phone `List` and `KeyValue` cover most uses |
| Donut, pie, share of a whole | `Bars` style `share`: money and data both need it, and one drawing serves both |
| Line chart over many points | Up to 7 compared amounts: `Bars`; 3–12 values with the latest value: `Sparkline`; longer series: data `LineChart`, health `Measurements` |
| Avatar, avatar group | `Profile`, and `People` style `stack` |
| Badge | `List` trail `badge`, `Card` badge (corner placement pending), counts on `TabBar` from code |
| Toast, snackbar | `Success` style `toast` |
| Confirm dialog | `Button` with `confirm`: the kit draws a standard confirm sheet, no model line |
| Accordion, FAQ | `List` style `expand` |
| Carousel | `List` style `shelf` (cards with titles), `Gallery` style `carousel` (photos) |
| Rating display | `Scale` style `stars` with `readonly` |
| Leaderboard | `List` style `ranked`: four packs need it, so it is a core option, not a pack component |
| Overflow menu | `Sheet` style `menu`, opened from the `Header` action |
| Countdown to a date | `Timer` style `until` |
| Repeat or reminder picker | `Field` kind `repeat` |
| Error with retry, offline | `Empty` kind `error` and `offline` |
| Onboarding, paywall | Built archetypes (`onboarding`, `plans`) from `Hero`, `Steps`, `Choice`, `Button` |
| Filter bar with sort | `Chips` in the core; `FilterBar` in the `data` pack |
| Divider, spacer, layout grids | The screen's rhythm table (plan 5.6) owns spacing |
| Floating add button | `Button` (one primary per screen, bottom region) |
| Spinner, skeleton | The kit draws `loading` for every component; never written by a model |
| PIN or code entry, colour picker, signature pad | Rare outside one domain; `Canvas` until misses ask |

## 2. Six added components

### `Sheet` · built · action · phone · overlay · weight 0

A panel that rises from the bottom over the current screen, dims what is behind it, and closes by a swipe
down, a tap outside or its close button. It is the only component outside the screen's flow: it lives in
the `overlay` region, at most one per screen, hidden until something opens it. It never holds other
components, only its own items, so screens stay flat.

- **Pick:** more about one item without leaving the screen, picking from six or more options, or a few
  extra actions behind the header. Not a message that stays on the screen (`Banner`), not 2 to 5 options
  shown inline (`Choice`, `Chips`), not a whole new task (a new screen through `goto`), not confirming a
  dangerous press (`Button` with `confirm`).
- **Writes:** `title` text(40), `sub` text(100) optional, `style` (`detail` default, `picker`, `menu`), and
  one `items` array for every style. Each item has `label` text(28), optional `meta` text(36), `value`
  text(28), `icon` and `goto`, and `danger` boolean (default false).
  - `detail`: 1–6 facts, each with a `value`; `action` (label text(24), `goto` optional) optional.
  - `picker`: 6–12 options, `at` index optional and picker-only. The selected option stays visible.
  - `menu`: 2–6 actions; `danger` marks an item. There is no separate picker `label`.
- **Parts → actions:** `close dismiss`; detail `action press`; picker items `root select`; menu items
  `root press`.
- **Opening it:** `goto` gains the value `sheet` (this screen's sheet) everywhere a screen id is allowed:
  the `Header` action, `Button`, `List` rows, `Card`. A flow step can open it too.
- **States:** filled. · **Real path:** a local overlay on the current screen.
- **Read:** printed under the screen only while open, with the runtime mark `open` (plan 4.12 `marks`):
  `s1 Sheet[picker] "Repeat"`.
- **Kit work:** `KitSheet` (grabber, title, content, safe area, `sheet` elevation, spring `gentle`), the
  `overlay` region in `Screen`, a focus trap, `dismiss` in the interaction store, `screenId` accepting
  `sheet`.

### `Composer` · built · pending: empty/sent states · input · phone · body · weight 2

A text box that grows to several lines for writing in full sentences. As an entry it fills the width with a
soft border and a quiet character count; as a reply it sits at the end of a conversation with a send button
that stays disabled while the box is empty.

- **Pick:** writing more than one line: a journal entry, a review, a note, a message or a reply. Not one
  short value on a form (`Field` kind `text`), not finding something by name (`Search`).
- **Writes:** `label` text(24) optional, `hint` text(60) (placeholder), `max` 80–2000 (default 600, shown
  as the count), `value` text(2000) optional and no longer than `max`, `style`.
- **Styles:** `entry` (multi-line box), `reply` (one line growing to four, with send; after `Bubbles` or
  social `Comments`).
- **Parts → actions:** `field type` (text), `send send` (reply only).
- **States:** filled. **Pending:** empty (the hint shows) and success (the sent text joins the conversation)
  state treatments. The hint, disabled empty send, clearing and appending a reply to `Bubbles` are built.
- **Tier:** `phone`; the `send` part of `reply` reads `!needs-people` through optional
  `meta.partTiers` (`{ send: "people" }`), because a reply only matters when someone else reads it.
- **Real path:** the text is saved to one record on the device; a reply goes through the same shared app as
  the conversation above it.
- **Kit work:** `KitTextArea` (grows with content, keyboard-safe, role textbox multiline), `KitSend`; copy
  `charLine(n, max)` and the send label. The kit pins `reply` above the keyboard.

### `Progress` · built · data · phone · body · weight 2

Show one or more measured amounts against their own targets, in horizontal bars or a single ring.

- **Pick:** a ratio with a target, not comparisons without targets (`Bars`), independent summary
  numbers (`Stats`), ordered stages (`Steps`), or concentric daily goals (`ActivityRings`).
- **Writes:** `bars` of `label`, `value` number ≥ 0, `of` number > 0. The `bars` style accepts one to
  five rows with labels text(20), optional `unit` text(8), `tone` (`warn` default, `good`, `bad`)
  for amounts past the target, and optional `goto`. The `ring` style accepts one row with a label
  text(24) and optional top-level `sub` text(48). Omit row extras on rings. The shared defaults
  `tone: "warn"` and `figures: "exact"` are accepted if sent explicitly.
- **Styles:** `bars` (default) and `ring` (a circular goal with the amount inside). Both support
  `density`; bars support `figures`. On rings, `emphasis: "hero"` enlarges the figure and
  `detail: "brief"` hides the stored caption without dropping it.
- **Parts → actions:** items `root press` on linked bars only. Rings expose top-level `ring`,
  `value`, `label`, `sub` and `root`, with no actions or item addresses. · **States:** filled, empty,
  loading. · **Ring signature:** `ring_fill`.
- **Real path:** amounts summed from records on the device, each compared with a target stored there.
- **Read:** `"Protein" 62 of 120 g · "Carbs" 180 of 200 g`.
- **Compatibility:** the saved-input migration converts old `Ring` lines to `Progress[ring]` with
  legacy sizes normalized, preserving instance IDs and part addresses. `Ring` is not a live Writer ID.

### `Choice` · built · input · phone · body · weight 2

Two to five options stacked as large tappable cards or rows, each with a title, a sentence under it, an
optional icon and an optional value on the right (a price, a duration). The chosen card takes an accent
ring and a tick. With `multi`, several can be chosen.

- **Pick:** choosing among a few options that each need a sentence to explain: a plan, an answer to a
  question, a way of doing something, an onboarding question. Not a few one-word options (`Chips`), not a
  short value inside a form (`Field` kind `choice`), not switching views (`Segmented`), not keep-or-skip one
  at a time (`SwipeStack`), not six or more options (`Sheet` style `picker`).
- **Writes:** `question` text(60) optional, `options` of `title` text(28), `sub` text(80) optional, `icon`
  optional, `value` text(16) optional, `badge` text(12) optional ("Most popular"), `on` boolean optional,
  2–5; `at` index (without `multi`); `multi` boolean (default false); `style`. A single choice uses `at`
  or the first `on` option, then derives `on` for every option. A multi choice uses `on` and omits `at`.
- **Styles:** `cards` (default), `list` (rows with a radio or tick on the left, for longer questions).
- **Parts → actions:** items `root select` (with `multi`: `toggle`). · **States:** filled, loading.
- **Real path:** the chosen option is stored on one record on the device.
- **Kit work:** `KitOption` (card or row, selected ring, badge corner, role radio or checkbox).

### `Amount` · built · pending: change arrow · data · phone · body · weight 2

One sum of money written properly in English: the currency symbol in its currency's format, tabular
digits, an optional period ("/ month"), an optional old price struck through, and an optional change
with an arrow in `good` or `bad`.

- **Pending:** the change arrow. The view currently shows signed text with its tone.
- **Pick:** one sum of money is the point: a balance, a price, a total, what is owed. Not two to four
  figures side by side, even if they are money (`Stats`), not the headline in words (`Hero`), not a price
  on each row of a list (`List` trail `value`).
- **Writes:** `label` text(24) optional, `value` number, `currency` (from the catalog's `currency` enum of
  ISO 4217 codes; default `USD`, written explicitly for another currency), `per` (`none` default, `hour`,
  `day`, `night`, `week`, `month`, `year`, `each`, `person`), `was` number optional, `change` number optional
  (signed), `changeIn` (`money` default, `percent`), `sub` text(40) optional, `goto` optional, `style`.
- **Styles:** `inline` (default: label left, amount right, on its own row), `large` (display size,
  centred: the screen's headline number), `total` (a rule above, the label "Total" from copy unless
  `label` is given).
- **Parts → actions:** `root press` (when linked). · **States:** filled, loading.
- **Real path:** a sum computed on the device from stored records; no money moves (paying is a pack
  component with tier `service`).
- **Read:** `"Balance" €1,240.50 · down €32 this week`.
- **Kit work:** `moneyLine(value, currency, per)` in `catalog/copy.ts` over `Intl.NumberFormat`; the
  `currency` prop helper; `KitText role="number" tabular` draws it.

### `Player` · built · pending: variant layouts/read status · content · phone · body · weight 3

Plays one piece of audio or video: artwork or the video frame, title and source, a scrubber with elapsed
and remaining time, play and pause, and skip back and forward by 15 seconds. `audio` has square artwork and
large controls, `video` a 16:9 frame with controls over it, `compact` one row for audio.

- **Pending:** video controls over the frame and the one-row compact layout. Every style currently stacks
  the title, scrubber, times and controls. Local playback, seeking and skips are built.
- **Pick:** listening to or watching one recording now: a meditation, a lesson, an episode, a workout
  video, a voice memo. Not a list of recordings to choose from (`List`, media `Playlist`), not a picture
  (`Photo`), not timing an activity with no recording (`Timer`).
- **Writes:** `media` (a media reference like `photo`: `lib:<tag>` or a file the person added), `title`
  text(40), `sub` text(40) optional (artist, teacher, show), `photo` optional (artwork), `seconds` 1–36000
  (length), `at` seconds optional (where it resumes), `style`.
- **Styles:** `audio` (default), `video`, `compact`.
- **Parts → actions:** `play play`, `play pause`, `scrubber seek`, `back press`, `forward press`.
- **States:** filled, loading.
- **Real path:** a file stored on or bundled with the app, played by the device's media player.
- **Read:** elapsed and remaining time. **Pending:** a paused/playing mark, as in
  `"Evening wind-down" · 4:05 of 12:00 · paused`.
- **Kit work:** `KitScrubber` (role slider, `clockLine` labels), `KitMediaControls`, a `media` prop helper,
  and a media adapter behind the host interface (plan 5.3) so the kit never imports a player library.

## 3. Merged components

Merge only if a pair's near-miss `choose` probes are unstable on a required model, or the Critic logs
repeated wrong picks. The recorded gate merged `DayTimeline` and retained `Sparkline`.

| Old id | Built result | Props mapping | Catalog work |
| --- | --- | --- | --- |
| `DayTimeline` | `Timeline` style `hours` | `blocks` of `start`, `end` (HH:MM), `title`, `tone`, `goto` become `items` with `time` and `end` | Up to 8 items; `meta.weightByStyle` keeps weight 3; `meta.signatureByStyle` keeps `day_unfold` |

`catalog/migrations/day-timeline.ts` rewrites lines, screens and JSON Lines while keeping component ids,
state, links and tones. Migration aliases `daytimeline`, `dayplan`, `timeblocks`, `hourly`, `daily` and
`chronology` target `Timeline`; legacy `blocks` become `items` in `hours`. Old component recordings are retired.

`Sparkline` keeps its id, latest value and 3–12 points. `Stats` keeps `tiles` and `inline`, with text(8)
values; there is no `Stats[trend]` style.

## 4. The full core

### Structure (4)

### `Header` · built · structure · phone · top · weight 1
The screen's name at the top, as a large title, an inline title, or a back arrow with a title, with at most
one corner action.
- Pick: every screen that needs a name. Not the label of one group inside the screen (`SectionTitle`).
- Writes: `title` text(28), `sub` text(40) optional, `action` (icon, label text(16), `goto`) optional.
- Styles: `large`, `inline`, `back`. · States: filled. · Parts → actions: `action press` (may open `sheet`).

### `SectionTitle` · built · structure · phone · body · weight 1
A small heading above a group of content, with one optional link on the right ("See all").
- Pick: label a group so the screen scans; names a `List` `shelf`. Not the screen's name (`Header`).
- Writes: `text` text(32), `link` (label text(16), `goto`) optional. · Parts → actions: `link press`.

### `Steps` · built · structure · phone · top · weight 1
Where the person is in a short sequence: dots, a segmented bar or numbered circles, with an optional label.
- Pick: a flow of 2 to 6 screens. Not progress toward an amount (`Progress`).
- Writes: `count` 2–6, `at` 1–6, `label` text(32) optional. · Styles: `dots`, `bar`, `numbered`.

### `TabBar` · built · structure · phone · bottom · weight 1 · code-owned
Bottom navigation with 2 to 5 tabs, built by code from sections marked `nav`; never written by a model.
- Writes (code): `tabs` of icon, label text(12), `goto`, optional `count` int 0–9999, 2–5; `at`.
  Code supplies unread/due counts, never the model.
- Parts → actions: items `root select`.

### Content (11)

### `Hero` · built · pending: photo title overlay · content · phone · body · weight 3
The one thing this screen says, as a large statement, a full-bleed photo with a title over it, or a big
number with a caption.
- Pending: the photo title overlay. The view currently puts the title after the photo.
- Pick: one headline fact or message. Not one sum of money as the headline (`Amount` style `large`), not
  several numbers (`Stats`), not something to notice now (`Banner`).
- Writes: `title` text(40), `sub` text(80) optional, `photo` optional, `tone`.
- Styles: `statement`, `photo`, `number`. · States: filled, loading.

### `Card` · built · pending: corner badge · content · phone · body · weight 2
One thing with a little detail: title, body, meta, an icon or a photo (not both), optionally tappable.
- Pick: one featured thing to open. Not several things of a kind (`List`), not facts about one thing
  (`KeyValue`).
- Writes: `title` text(40), `body` text(120), `meta` text(24), `icon` or `photo`, `tone`, `goto`;
  `badge` text(12) optional: a status pill in the top corner ("Paid", "Due today", "New").
- Styles: `plain`, `tinted`, `outlined`, `media`. · States: filled, loading. · Parts → actions: `root press`.
- Pending: corner placement; the badge currently sits in the content.

### `List` · built · content · phone · body · weight 2
Several things of one kind as rows (title, meta, icon or photo, and a trail: chevron, check, switch, value
or badge), each tappable.
- Pick: several things of one kind to scan and tap. Not one featured thing (`Card`), facts about one thing
  (`KeyValue`), jobs to tick off (`Checklist`).
- Writes: `rows` of `title` text(28), `meta` text(36), `icon`, `photo`, `trail`, `value` text(10), `goto`,
  1–6; `body` text(200) optional per row; `me` boolean optional per row (at most one). A `body` makes the
  list `expand`; otherwise a `me` row makes it `ranked`, whatever style was written. Write a body on every
  expandable row and a photo on every shelf row.
- Styles: `inset` (default), `plain`, `cards`, `shelf` (a sideways rail of 2–6 photo cards with the next one
  peeking, named by a `SectionTitle` above it: "Popular", "Continue", "Near you"), `expand` (each row
  opens in place to show its `body`: FAQs, instructions), `ranked` (rows numbered 1 to n in order,
  the top three marked, the `me` row tinted, `value` as the score: leaderboards for social, learning, health
  and sports).
- Parts → actions: items `root press` (`root toggle` in `expand`), `trail toggle`.
- States: filled, empty, loading.

### `KeyValue` · built · content · phone · body · weight 2
Labelled facts about one thing in rows or a two-column grid.
- Pick: details of one thing (its room, schedule, size). Not one sum of money (`Amount`).
- Writes: `pairs` of label text(20), value text(100), icon, 1–6. Mark at most one unmasked pair as `status` and keep its value to 20 characters. Masked values still have a 28-character limit. · Styles: `rows`, `grid`.
- Long values wrap below the label; a primary status uses strong text on a semantic surface.
- States: filled, empty, loading.

### `Note` · built · content · phone · body · weight 1
One short sentence of supporting information, as body text, a quote or a hint.
- Pick: one sentence that helps. Not something urgent (`Banner`), not the person's own writing (`Composer`).
- Writes: `text` text(120), `tone`, `icon`. · Styles: `body`, `quote`, `hint`.

### `Photo` · built · content · phone · body · weight 2
One picture with an optional caption; the style is its shape.
- Pick: one picture matters. Not several (`Gallery`), not a recording (`Player`).
- Writes: `photo`, `caption` text(80) optional. · Styles: `wide` (default), `square`, `tall`.
- States: filled, loading.

### `Gallery` · built · content · phone · body · weight 3
Several pictures as a grid, a sideways strip, or a full-width carousel.
- Pick: several pictures together. Not one (`Photo`), not titled cards to open (`List` style `shelf`).
- Writes: `photos` of photo, caption text(24), `goto`, 2–6.
- Styles: `grid`, `strip`, `carousel` (full width, one at a time, page dots: product, listing and
  place photos).
- Parts → actions: items `root press`. · States: filled, empty, loading.

### `Profile` · built · content · phone · top · weight 2
Who or what this screen is about: a photo, a name and a meta line, as a row or centred.
- Pick: the identity of the person, pet, plant or thing. Not other people involved (`People`).
- Writes: `name` text(32), `meta` text(48), `photo`. · Styles: `row`, `centered`. · States: filled, loading.

### `Banner` · built · content · phone · top · weight 2
A tinted strip near the top with an icon and a sentence that needs attention now, optionally tappable.
- Pick: something to notice now (overdue, offline, a change). Not a helpful sentence (`Note`), not an offer
  (commerce `Promo`).
- Writes: `text` text(80), `icon`, `tone` (default `warn`), `goto`.

### `Empty` · built · content · phone · body · weight 2
A calm, centred message on a screen with nothing in it yet, with an icon badge.
- Pick: there is no content yet, no matches under the current filter, no work left, or loading failed. Not a sentence beside content (`Note`).
- Writes: `title` text(40), `sub` text(100) optional, `icon` optional; `kind` (`none` default, `filtered`,
  `complete`, `error`, `offline`). No `goto`; a `Button` below it carries the next step.
- Parts → actions: `retry press` (error, offline). No root action. · States: filled.

### `Player` · built · pending: variant layouts/read status · content · phone · body · weight 3
See section 2.

### Data (9)

### `Stats` · built · data · phone · body · weight 2
Two to four numbers as tiles or one inline row, each with a label, unit and an optional trend arrow.
- Pick: a few summary numbers side by side, money included. Not one sum as the point (`Amount`) or
  measured amounts against targets (`Progress`).
- Writes: `tiles` of label text(20), value text(8), unit text(8) optional, trend (`up`, `down`, `flat`)
  optional, 2–4.
- Styles: `tiles` (default), `inline`. A latest value with a small line is `Sparkline`, not a Stats style.
- States: filled, empty, loading. · Signature: `count_up`.

### `Bars` · built · pending: share icons/press/order · data · phone · body · weight 2
Two to seven columns comparing amounts across days or categories under a title, the largest in accent; or
one bar split into shares of a whole with a legend.
- Pick: compare amounts with each other, or show how a whole splits into parts. Not progress toward targets
  (`Progress`), not a latest value with a trend (`Sparkline`).
- Writes: `title` text(32), `unit` text(8) optional, `points` of label text(4), value ≥ 0, 2–7; in style
  `share`: labels up to text(16), 2–6 points; shares and the total are computed by code. An `icon`
  per share is pending.
- Styles: `columns` (default), `share` (one stacked bar the full width, the
  total above it, and a legend of label, value and percent, largest first: spending by category, time by
  project, votes by option; replaces the first plan's money `Spending` and data `Donut`).
- Parts → actions: none built; `share` legend items `root press` are pending. · States: filled, empty, loading.
- Pending: share icons, legend presses and largest-first order. The current legend is static and keeps input order.
- Signature: `bars_grow`.

### `Sparkline` · built · data · phone · body · weight 1
One latest value with a small line of its recent rise or fall.
- Pick: one measurement and how it is changing. Not amounts compared across days or categories (`Bars`),
  not several independent summary numbers (`Stats`).
- Writes: `label` text(24), `value` text(10), `points` 3–12 numbers, `tone` (`neutral` default, `good`,
  `warn`, `bad`).
- States: filled, loading. · Parts → actions: none.
- Real path: recent measurements of one field stored on the device.

### `Progress` · built · data · phone · body · weight 2
See section 2.

### `Amount` · built · pending: change arrow · data · phone · body · weight 2
See section 2.

### `Timeline` · built · data · phone · body · weight 2
Things in time order with a time column, as a day plan or a history, or as blocks on an hour rail.
- Pick: when things happen, in order. Not which days have something (`Calendar`), not jobs (`Checklist`).
- Writes: `items` of `time` text(12), `title` text(32), `meta` text(32) optional, `done`, 1–6 in `day`
  and `history`; `hours` takes 1–8 items with `time` and a later `end` as HH:MM, `tone` and `goto`
  optional. Only `hours` accepts `end`, `tone` and `goto`; omit `meta` and `done` there. Code orders hour
  blocks by their start time.
- Styles: `day` (default), `history`, `hours` (blocks sized by duration so gaps show; `DayTimeline` is merged).
  `record` shows one record's state changes, with `record` text(48), `current` text(24), optional `reference` text(24), and public item `summary` text(80). Only an explicitly authorized `audience: "detail"` view includes item `meta`; public callers omit it from the source line. The presentation is not access control.
  `hours` keeps weight 3. · States: filled, empty, loading.
- Parts → actions: linked hour blocks `root press`; day and history are read-only.
- Signature: `day_unfold` (on `hours`).

### `Calendar` · built · data · phone · body · weight 3
A week strip or a month grid with marked days in a tone and one selected day.
- Pick: which days have something, and opening a day. Not what happens within a day (`Timeline`).
- Writes: `month` text(16), `marked` of day 1–31 and tone, 0–12, `selected` optional, `start`, `days`.
- Styles: `week`, `month`. · Parts → actions: items `root select`. · Signature: `calendar_sweep`.

### `Counter` · built · data · phone · body · weight 2
One number nudged up or down by a fixed step with large minus and plus buttons.
- Pick: keep one running count (glasses of water, laps). Not a quantity on a product (commerce `Product`).
- Writes: `label` text(24), `value` int ≥ 0, `unit` text(8), `step` 1–100.
- Parts → actions: `minus decrement`, `plus increment`.

### `Timer` · built · data · phone · body · weight 2
A large clock counting down or up with start and stop, or the time left until a date.
- Pick: time an activity now, or count down to a date. Not a recording to play (`Player`).
- Writes: `label` text(24), `seconds` 0–86400 in `down` and `up`; `until` date `YYYY-MM-DD` with optional
  `at` time `HH:MM` in `until` only, with no `seconds`.
- Styles: `down`, `up`, `until` (days, hours and minutes left: a trip, a wedding, a deadline; no
  start or stop). · Parts → actions: `start`, `stop` (not in `until`). · Signature: `timer_spin`.

### Input (8)

### `Field` · built · pending: photo permission tier · input · phone · body · weight 1
One labelled piece of information, including contact details or a private account credential.
- Pick: one value on a form. Not several lines of writing (`Composer`), not options that need a sentence
  each (`Choice`).
- Writes: `kind` (`text` default, `number`, `date`, `time`, `choice`, `repeat`, `toggle`, `slider`, `photo`,
  `range`, `voice`, `email`, `password`, `code`, `phone`, `file`),
  `label` text(24), `value` text(40) optional (one line), `hint` text(60) optional, `options` text(16),
  2–4 (required for `choice` only). Kind `repeat` uses its own `repeat` prop (`never`, `daily`, `weekdays`,
  `weekly`, `monthly`, `yearly`), never `value`; omit `repeat` for other kinds.
- `email` and `phone` use the corresponding keyboards. `password` starts masked and has a local Show/Hide
  control. `code` uses 4–8 digit boxes (`length`, six if omitted). Do not prefill either private kind.
- Parts → actions: `field` `type`, `select`, `toggle`, `set` or `press` (photo) by kind.
  `password` and `code` have local-only entry, not an agent `type` action.
  `file` has no `value`: `attach press` opens the host picker; `remove_attachment press` detaches the current opaque file without deleting the original.
- Tier: `phone`, except `photo` and `voice` require your OK, and the `password`/`code` input and password
  reveal parts need an outside service for real account flows.

### `Chips` · built · input · phone · body · weight 1
A wrapping row of two to six short pills to filter, or to pick one.
- Pick: filter, or pick among a few one-word options. Not options needing a sentence (`Choice`), not
  switching views (`Segmented`).
- Writes: `items` of label text(16), on, icon, 2–6. · Styles: `filter`, `choose`.
- Parts → actions: items `root toggle` or `select`.

### `Segmented` · built · input · phone · top · weight 1
A tinted track of 2 to 4 equal segments that switches between views of the same screen.
- Pick: switch between views (Day, Week, Month). Not filtering a list (`Chips`).
- Writes: `options` of label text(14), 2–4, `at`.

### `Checklist` · built · input · phone · body · weight 2
Up to six jobs with one independently addressable checkbox each and a live completed/total count.
- Pick: things to do and tick off. Not things to scan and open (`List`), not quiz answers (`Choice`).
- Writes: `items` of text text(36), done, meta text(24), 1–6. · Parts → actions: items `check check`.
- States: filled, empty, loading. · Signature: `check_burst`.

### `Search` · built · input · phone · top · weight 1
A search box with a magnifier and a hint.
- Pick: find one thing among many by name. Not writing text (`Composer`).
- Writes: `hint` text(40). · Parts → actions: `field type`.

### `Scale` · built · input · phone · body · weight 2
Five faces, stars or dots to log a level from one to five, or stars that show a rating.
- Pick: log a level or feeling 1 to 5, or show how something is rated. Not a number with a unit
  (`Counter`, `Field` kind `slider`).
- Writes: `label` text(32), `value` 0–5 (integers when editable); `readonly` boolean (default false),
  in style `stars` only. A readonly rating accepts half steps and `meta` text(24) ("4.5 · 212 reviews");
  editable ratings omit `meta`.
- Styles: `dots` (default), `mood`, `stars`. · Parts → actions: `l1`…`l5 select` (none when `readonly`).

### `Choice` · built · input · phone · body · weight 2
See section 2.

### `Composer` · built · pending: empty/sent states · input · phone · body · weight 2
See section 2.

### Action (5)

### `Button` · built · action · phone · bottom · weight 1
The one thing to do next as a full-width button (`primary` at most once per screen), or a quieter one.
- Pick: the main thing the person does. Not 2 to 4 shortcuts (`Actions`).
- Writes: `label` text(24), `kind`, `icon`, `goto` (a screen id or `sheet`); `confirm`
  text(60) optional: pressing first shows a standard confirm sheet with this sentence, a confirm button in
  the button's tone and cancel. `PhoneScreen` draws it through the shared tap/agent dispatcher and waits
  for `confirm/confirm press` or `confirm/cancel dismiss` before the original action runs. It is not a
  `Sheet` component and does not count against the one-sheet rule.
- Kinds: `primary`, `secondary`, `quiet`, `danger`. · Parts → actions: `root press`.

### `Actions` · built · action · phone · body · weight 2
Two to four shortcuts as icon tiles.
- Pick: a few different things the person can do next. Not the one main thing (`Button`), not a menu of
  extra actions (`Sheet` style `menu`).
- Writes: `items` of icon, label text(16), `goto`, 2–4. · Parts → actions: items `root press`.

### `SignInOptions` · built · action · service · body · weight 2
A short stack of provider buttons for account access. Labels are built in; the buttons only navigate
between mock screens.
- Pick: offer ways to log in or create an account. Not ordinary shortcuts (`Actions`) or the main
  form submit control (`Button`).
- Writes: `items` of `provider` (`apple`, `google`, `email`, `phone`) and `goto`, 1–4 distinct providers;
  optional `divider` text(12), such as “or”.
- Styles: `emphasis`: `normal`, `quiet`; `detail`: `full`, `brief` (hides divider).
- Parts → actions: items `root press`.

### `Success` · built · pending: toast placement/expiry · action · phone · body · weight 2
Proof something worked: a large tick, a title and a line; or a toast at the bottom for a few seconds with an
optional undo.
- Pick: confirm an action worked. Not news to notice later (`Banner`).
- Writes: `title` text(40), `sub` text(100) optional, `icon`; `undo` boolean (default false).
  `undo: true` makes it a toast, whatever style was written.
- A structured screen can add `outcome`: `pending` requires `owner` and `next`; `confirmed` requires
  `subject` and `when`; `done` requires `receipt`. Keep the actual record and do not use a green check for a pending request.
- Styles: `screen` (default), `toast`. · Parts → actions: `undo press` (with undo), `close dismiss` (toast).
- Pending: bottom placement and timed expiry. The toast is currently a body-flow card; close and undo
  dismiss it locally. · States: filled.

### `HandoffReceipt` · built · content · people · body · weight 2

One shared record's transfer from a sender to a recipient, with the reported state and an optional link
to the underlying record. A completed hand-off is not the same as completing the recipient's work.

- Pick: show who sent, received or returned one record. Not a local confirmation (`Success`), a chat
  (`Bubbles`), the underlying work (`List`), or an audit of many changes (`ActivityLog`).
- Writes: `subject` text(36), `reference` text(20), `fromRole` text(24), `toRole` text(24),
  `phase` (`waiting`, `received`, `returned`), optional `at` offset ISO timestamp, optional `summary`
  text(120), optional `goto`.
- Styles: `detail`: `full`, `brief` (hides summary). · States: filled.
- Parts → actions: `root press` when linked; `subject`, `reference`, `sender`, `recipient`, `phase`,
  `time`, `summary` and `open_label` are read-only. A real host supplies the latest acknowledged phase
  and enforces access.

### `Sheet` · built · action · phone · overlay · weight 0
See section 2.

### Beyond phone (4)

### `Camera` · built · beyond · ok · body · weight 3
A dark viewfinder with a hint and a shutter, for a photo or a scan.
- Pick: point the camera at something now. Not choosing an existing photo (`Field` kind `photo`).
- Writes: `kind` (`photo`, `scan`), `hint` text(48). · Parts → actions: `shutter press`.

### `MapPins` · built · data · service · body · weight 3
A stylised map with up to five numbered pins and the places listed under it.
- Pick: where a few places are. Not the path between them (`Route`).
- Writes: `pins` of label text(24), `goto`, 1–5. · States: filled, loading.

### `Bubbles` · built · content · people · body · weight 2
A conversation as chat bubbles, mine on the right in accent, theirs on the left.
- Pick: a conversation between people. Not comments under a post (social `Comments`).
- Writes: `messages` of from (`me`, `them`), text text(120), 1–6; `with` text(24). · States: filled, empty.
- Change: none to the component; the `chat` archetype adds `Composer` style `reply` after it.

### `People` · built · content · people · body · weight 2
Who else is part of this, as rows with avatar, name and role, or as an overlapping stack.
- Pick: other people involved. Not the one person this screen is about (`Profile`).
- Writes: `members` of name text(24), role text(24), photo, `goto`, 1–6; `more` int 1–999 optional (shown
  "+3" through `moreLine`). `more` makes it a stack; a stack drops members' `goto` rather than rejecting it.
- Styles: `rows` (default), `stack` (overlapping avatars with a count:
  assignees, attendees, shared with). · States: filled, empty.
- Parts → actions: linked row members `root press`; stacks are read-only.

### Signature (3)

### `SwipeStack` · built · content · phone · body · weight 3
A stack of cards; the top one swipes right to keep and left to skip.
- Pick: decide on things one at a time. Not options side by side (`Choice`).
- Writes: `cards` of title text(32), photo, meta text(24), 2–6. · Parts → actions: items `root swipe`.
- Signature: `card_swipe`.

### `Streak` · built · data · phone · body · weight 2
Days in a row as a big count, with this week's days marked.
- Pick: a habit kept day after day. Not a count with no days (`Counter`).
- Writes: `count`, `label` text(24), `days` exactly 7 booleans. · Signature: `streak_flame`.

### `Route` · built · data · service · body · weight 2
A path drawn through stops from start to end, with an optional distance.
- Pick: a journey through stops. Not places without a path (`MapPins`), not a trip plan by day (trips
  `Itinerary`).
- Writes: `stops` of label text(24), meta text(16), 2–6; `distance` text(12). · Signature: `route_draw`.

### Escape (1)

### `Canvas` · built · escape · phone · body · weight 3
A framed area for an idea the library cannot express (a game, a drawing tool), with a caption. Every use is
logged as a miss and feeds the catalog review.
- Writes: `caption` text(80).

## 5. Archetypes

All twenty core archetypes are implemented as data. `defaultLines` validates every layout, and `runComposeProbes` scores required slots, screen rules and the text-first rubric.

The built ids are `home`, `dashboard`, `list`, `detail`, `form`, `checklist`, `calendar`, `tracker`,
`journal`, `profile`, `settings`, `success`, `onboarding`, `capture`, `chat`, `plans`, `browse`,
`signin`, `signup` and `verify`.
The recipes affected by the added components are:

| Archetype | Built use | Recipe |
| --- | --- | --- |
| `chat` | Uses `Composer` | Header, Bubbles, Composer[reply] |
| `journal` | Layout `write` | `entries`: Header, Card, Button · `write`: Header, Field[date], Scale[mood], Composer[entry], Button |
| `onboarding` | May ask a question | Hero, Note, Steps, Choice \| Button |
| `plans` | Pricing and upgrade | Header, Hero, Choice (with `value`), Note, Button |
| `browse` | Shelves to explore | Header, Search, Chips, SectionTitle, List[shelf], SectionTitle, List[shelf] |
| `signin` | `credentials`: log in to an account | Header or Hero, Field[email], Field[password], primary Button (Log in), Note or quiet Button (Forgot password?), optional SignInOptions |
| `signup` | `credentials`: create an account | Header, Field[text], Field[email], Field[password], Note (terms), primary Button (Create account), optional SignInOptions, quiet Button (Log in) |
| `verify` | `code`: enter a one-time code | Header, Note (where the code went), Field[code], primary Button (Verify), quiet Button (Resend code) |

## 6. Built screen rules

- Account archetypes carry the `service` tier: their links show the mock flow, not real sign-in.
  Passwords and one-time codes never enter authored lines or agent actions. Use one primary submit
  Button; recovery, switching to log in and resending use quiet links.
- At most one `Sheet` per screen, region `overlay`; something on the screen opens it (a `goto: sheet`)
  unless a flow step does. It does not count toward the screen's weight.
- At most one `Choice`, one `Player` and one `Composer` per screen; `Composer[reply]` comes last in the body,
  after `Bubbles` or `Comments`.
- At most one `Amount[large]` per screen, never together with `Hero[number]`.
- A `Button` with `kind: danger` and no `confirm` raises an issue (rules never repair, plan 4.5); the repair
  stage should then fill `confirm` from copy.

## 7. Build order

| Step | Built | Gate and remaining work |
| --- | --- | --- |
| C1, options | `Field` repeat, `Timer` until, `Scale` readonly, `People` stack, `Gallery` carousel, `List` shelf, expand and ranked, `Bars` share, `Card` badge, `Success` toast, `Empty` kinds | Component majority probes pass; examples cover the options. Pending: photo tier, share icons/press/order, corner badge and toast placement/expiry |
| C2, simple additions | `Progress`, `Amount`, `Choice`, `Composer` with `KitProgressBar`, `moneyLine`, `currency`, `KitOption`, `KitTextArea`, `meta.partTiers` | Component majority probes pass, including near misses. Pending: Amount arrow and Composer empty/sent states |
| C3, overlays and media | `Sheet`, `overlay`, `dismiss`, `goto: sheet`, `Button` confirm; `Player`, media helper and host adapter, `play`, `pause`, `seek` | Chrome taps and `window.__lmthingUI.act` cover open/pick/dismiss, confirm/cancel and fixture playback/seeking. Pending: Player layouts/read status and native device acceptance |
| C4, merge gate | `DayTimeline` folded into `Timeline[hours]`, weight 3 and `day_unfold`; `Sparkline` retained | Recorded evidence decided the pair; migration tests preserve ids, state, links, tones and ordering; old DayTimeline recordings are retired |

Shared copy in `catalog/copy.ts`: send, cancel, confirm, close, undo, retry, offline, "See all", `moneyLine`,
`charLine`, period words (per night, per month), `moreLine(n)` ("+3"), `leftLine` ("3 days left").

## 8. Open questions, with the default to build

- **Does `Sheet` break flat screens?** Default: no. It holds its own items, never other components, and
  reads as one line while open.
- **Should `Player` stream?** Default: files on the device only (tier `phone`). Streaming is a media-pack
  concern with tier `service`.
- **More merges?** Use section 3's evidence gate. `DayTimeline` is merged; `Sparkline` stays.
- **Are 44 model choices too many for the cheapest model?** Default: no, because overlap is what hurts.
  Keep measuring near misses; fix `pick` lines before adding choices.

## Round 2 operational components

### `WorkQueueRow` · built · action · phone · body · weight 2

- Purpose: Find work awaiting a decision and open the exact record that needs attention.
- Pick: Work waiting for a decision, with separate record reference, status, owner, due time, priority and action for each task. Not general browsing (`List`) or a request inbox with SLA and completed views (`RequestQueue`).
- Writes: `rows` of `title` text(40), `recordRef` text(20), `status` text(20), `owner` text(32) optional, `due` text(32) optional, `priority` (`normal`, `high`, `urgent`), `action` text(24) optional, `goto` optional, 1–6. Supply both `action` and `goto`, or neither.
- Styles: `detail`: `full`, `brief` (hides owner, not urgency or deadline).
- Parts → actions: `root`; item `root`, `title`, `record`, `status`, `owner`, `due`, `priority`, `action press`, `action_label`. Only the labeled action navigates; an unlinked row is readable, not actionable.
- States: filled, empty (no work waiting), loading.
- Real path: opens a stable work record for review; the queue does not complete or decide the record.

### `RollupRows` · built · data · phone · body · weight 2

- Purpose: Compare the same measured total and supporting figures across several entities without a wide table.
- Pick: Compare one like-for-like number per entity, with its unit and period and optional breakdown or linked detail. Not independent headline measurements (`Stats`) or the attributes of one record (`KeyValue`).
- Writes: `period` text(28), `metric` text(28), `unit` text(12), `total` number optional; `rows` of `label` text(40), `value` number, `breakdown` text(80) optional, `goto` optional, 1–6. Include a total only when supplied and label the scope in the period.
- Styles: `detail`: `full`, `brief` (hides breakdowns, not numbers or units).
- Parts → actions: `root`, `period`, `metric`, `total`, `empty`; item `root press`, `label`, `value`, `detail`.
- States: filled, empty (no measured records), loading.
- Real path: shows aggregates for the same reporting period from underlying records; a linked row opens those records.

## 9. Wave 6 planned core additions, promotions & options

Based on the Wave 6 Google Play Store top-app audit across 32 app categories, 17 game categories, Kids, and Wear OS, two cross-domain core components, three pack-to-core promotions, fifteen targeted option upgrades, and the `copy` action are scheduled alongside the Wave 6 packs so no domain pack ever depends on another pack.

### Planned core components (2)

### `PassCard` · ready · content · phone
A digital pass, membership card, coupon, or transit pass displaying issuer branding, holder or account identifier (masked by default with reveal), scannable barcode or QR code via `KitCode`, live balance or points figure, up to four summary facts, and a high-brightness barcode zoom toggle.
- Pick: a scannable membership card, digital coupon, voucher code, or transit/insurance ID card shown across 3+ unrelated domains. Not a rich event admission stub (events `Ticket` / ticketing `EventPass`), not a travel boarding document with gates/legs (trips `Reservation`), and not a full loyalty tier wallet (dining `RewardsWallet`).
- Writes: `issuer` text(28), `title` text(32), `memberName` text(24) optional, `memberId` text(24) optional, `masked` boolean (default true), `code` text(64) optional, `codeKind` (`qr` default, `barcode` for Code 128), `bright` boolean optional (offer scanner view, initially off), `balance` number optional, `pointsLabel` text(20) optional, `facts` of `label` text(16), `value` text(24), 0–4, `expiresAt` date optional, `used` boolean (default false), `style`. Copy the code exactly. The barcode plate fits up to 10 printable ASCII characters or 20 digits in complete pairs.
- Styles: `card` (default, membership or insurance card with barcode toggle), `coupon` (tinted offer card with barcode and expiry), `code` (large centered QR/barcode with copyable code), `transit` (transit fare pass with balance and tap status).
- Parts → actions: `root press`, `reveal toggle` (masked ID), `code copy`, `bright toggle` (`ok`, local-only high-brightness scanner view when requested and the code can be drawn). The drawing retains the `qr` address for both symbologies.
- States: filled, empty (`Empty` when no pass saved), loading, error (invalid or unreadable code payload).
- Real path: stored locally on device and drawn by `KitCode`. The host manages screen brightness while scanner view is active. Never fabricates valid carrier, payment, or clinical insurer credentials.

### `FileList` · planned · content · ok
A bounded list of 1–6 non-image file attachments (`pdf`, `doc`, `sheet`, `zip`, `audio`, `other`) showing format badge, filename, human-readable size, optional page count or duration, and preview, download/share, or remove actions. Prevents `Photo` and `Gallery` misuse for PDFs, CVs, contracts, invoices, and email attachments.
- Pick: 1–6 attached documents or binary files with size and format metadata. Not photos (`Gallery`, `Photo`), not an interactive file explorer tree (workspace `DriveTree`, utilities `FileBrowser`), and not personal ID vault records with expiries (paperwork `Documents`).
- Writes: `files` of `fileRef` text(32), `name` text(48), `ext` (`pdf`, `doc`, `sheet`, `zip`, `audio`, `other`), `sizeBytes` number ≥ 0, `pages` integer ≥ 1 optional, `status` (`ready`, `downloading`, `missing`, `uploading`, `failed`), `goto` optional, 1–6; `removable` boolean (default false), `style`. Code formats `sizeBytes` consistently; models never invent download URLs. Compose with `Field` kind `file` to pick a new document.
- Styles: `rows` (default, compact attachment rows with action icons), `cards` (wider preview tiles with page count badge).
- Parts → actions: files `root press` (preview), files `download press`, files `remove press`. `meta.confirmParts: ["remove"]`; `meta.partTiers: { download: "service" }`.
- States: filled, empty, loading, error (missing local file or failed transfer).
- Real path: host document picker (`ok`) and share/download adapter (`service`); preview opens host native viewer.

### Core promotions from existing packs (3)

The three components below are promoted from domain packs into Core in Wave 6 Step 0 once Wave 5 stabilizes, eliminating pack-to-pack pressure across search, discovery, and reading apps. Existing copies remain documented inside their original Wave 3–5 pack specs until Wave 6 Step 0 migrates their imports and adds core near-miss probes.

| Component | Origin pack | Group / Tier | Why promoted to Core & additions in Wave 6 |
| --- | --- | --- | --- |
| `FilterBar` | `data` | `input` / `phone` | Search box + up to 4 picker filters + sort selector + active filter count; needed across `realestate`, `ticketing`, `stays`, `commerce`, `auto`, `places`, `hiring`, and `data`. |
| `Review` | `customers` | `content` / `people` | Average star score + 5-bar histogram + review/reply rows; gains optional `photos`, `fitScale` (apparel fit), `spoiler` toggle (books/film), and `verified` pill for `commerce`, `places`, `media`, `stays`, `dining`, `marketplace`, `beauty`, and `booking`. |
| `Article` | `media` | `content` / `phone` | Long-form formatted markdown/prose (`style`: `article`, `book`, `response`) with headings, quotes, callouts, optional `paper` (`light`, `sepia`, `dark`) and `fontScale`; needed across `media`, `news`, `reference`, `assistant`, `workspace`, `projects`, and `learning`. |

*(Watchlist: `BeforeAfter` starts in `studio` and `LiveRoom` starts in `social`; either promotes to Core only if future `Canvas` misses show cross-pack overlap.)*

### Core component option upgrades (15 targeted extensions)

| Core component | Proposed option (`style` / `kind` / `prop`) | Domains unblocked |
| --- | --- | --- |
| `Player` | Complete pending frame-overlaid `video` controls, 1-row `compact` audio, and play/pause read mark; add `mode` (`audio`, `music`, `podcast`, `video`, `live`), `speed`, `liked`, `shuffle`, `repeat`, `loop` | `media`, `watch`, `news`, `learning`, ringtones |
| `Camera` | Add `kind: "video"` (with `start`/`stop` shutter) and `kind: "document_dual"` (front+back guided scan) | `studio`, `money` (check deposit), `paperwork`, `auto`, `medical` |
| `Gallery` | Add `aspect: "tall"` (`["auto", "wide", "tall"]`) reusing `KitPhoto` portrait ratio | Wallpapers, `studio`, `watch`, `curation` |
| `List` | Allow `aspect: ["square", "wide", "tall"]`, `progress` (`0–1`), and `badge` on `style: "shelf"`; add `style: "grid"` (2-col quick cards) plus `unread` and `pinned` row props | `media`, `watch`, `workspace`, `comms`, `learning` |
| `Bubbles` | Add optional `style` (`direct`, `group`, `broadcast`), `sender`, `avatar`, `time`, `status` (`sent`, `delivered`, `read`), `replyTo`, `attachment` (`photo`, `voice`, `file`), `reactions` | `comms`, `social`, `dating`, `medical` |
| `Composer` | Complete pending empty/sent states; add optional `attach` boolean, `voice` boolean (`partTiers: { voice: "ok" }`), `attachments` chips, `replyingTo`, and `style: "prompt"` | `comms`, `assistant`, `learning`, `mind`, `utilities` |
| `Field` | Complete pending `ok` tier on `kind: "photo"`; add `kind: "range"` (dual-thumb min–max `KitSlider`) and `kind: "voice"` (`ok` mic capture via `KitMicCapture`) | `dating`, `realestate`, `commerce`, `stays`, `utilities` |
| `Calendar` | Add `range: boolean` (check-in to check-out two-date selection) | `trips`, `stays`, `booking`, `events`, `property` |
| `Route` | Add `mode` (`walk`, `bike`, `car`, `transit`, `flight`) and `duration` text(12) | `places`, `trips`, `navigation`, `health` |
| `Bars` | Complete pending `share` icons/press/order; add `active` bar index + `status` subline on `columns` (live venue busyness) | `places`, `dining`, `health` |
| `KeyValue` | Add optional `masked: boolean` with reveal toggle (`(secret)` read mark) | `money`, `auto`, `paperwork`, `security` |
| `Card` | Complete pending corner `badge`; add optional `reward` / `duration` pill option | `perks`, `commerce`, survey/earn apps |
| `Timer` | Add optional `goal` seconds prop on `style: "up"` (elapsed vs target fasting or session window) | `health`, `projects` |
| `People` | Add `style: "rail"` (horizontal strip with `online`, `ring`, `statusText` bubble) | `comms`, `dating`, `social` |
| `MapPins` | Add `userLocation` boolean (`ok`) and `selected` index to align with `KitMapTile` | `places`, `realestate`, `navigation` |

Action vocabulary addition: Wave 6 formalizes `copy` (in [README.md](README.md)) across core and packs (`PassCard`, `KeyValue[masked]`, `security`, `utilities`, `assistant`, `trips`, `social`, `puzzles`).

# Core components plan

The core is the set of components every app can use and every prompt carries. It goes from **40 to 44**:
six new components, two built ones folded into others, and new options on thirteen built ones. Entry format
and tier names: [README](README.md). Limits and aliases of built components are copied from
`packages/ui/src/components/*.tsx` as of 2026-11-17; the files win if they change.

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

Differences from the plan below, decided while building:

| Plan | Built | Why |
| --- | --- | --- |
| `Empty` takes a `goto` | No `goto`; a `Button` below it carries the next step | Keeps `Empty` to one job, and screens already place a `Button` |
| `Success` toast dismisses at its root | An icon `close` part carries `dismiss` | A card root has the role list; a button is the accessible target |
| `Success` `undo` needs `style: toast` | `undo: true` makes it a toast | The cheap model wrote `undo` alone two times in three |
| `People` stack rejects a `goto` | A stack drops `goto`; `more` makes it a stack | Same reason: the model mixed `rows` with `more` |
| `List` `body` and `me` only in their styles | A `body` makes it `expand`, a `me` row makes it `ranked` | Same reason |
| `Amount` `currency` defaults from the app | Defaults to `USD` in the catalog; the screen writes it | A kit default would make the reader and the view disagree |
| `Sheet` has `pairs`, `options` and `items` | One `items` array for all three styles | One schema the model can learn; counts are checked per style |
| `Sheet` picker is 6 to 12 | 6 to 12, and no `at` for the other styles | As planned |
| `Player` has `kind` and `style` | `style` only | One enum, as the component guide asks |
| `Button` `confirm` draws a kit sheet | `PhoneScreen` draws the standard sheet; taps and agent actions share its dispatcher | Confirm and cancel are addressed separately, and the original action waits for confirmation |
| `Scale` `readonly` is in halves for any style | Stars only | Faces and dots have no half |
| `Composer` `reply` `send` is `people` | Built through the new `meta.partTiers` | As planned |

Component size cleanup is still needed where metadata, examples and probes push a file beyond the 200-line guide.

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
| **New** (6) | `Sheet`, `Composer`, `Progress`, `Choice`, `Amount`, `Player` | Gaps found by at least three of the four research passes that no option on a built component can close |
| **Merged** (2) | `Sparkline` → `Stats` style `trend`; `DayTimeline` → `Timeline` style `hours` | Near neighbours a model may confuse; each is a different drawing of the same data. Gated by evidence (section 3) |
| **Changed** (13) | `List`, `Card`, `Gallery`, `Empty`, `Timer`, `Field`, `Scale`, `Button`, `Success`, `People`, `Stats`, `Timeline`, `Bars` | Shelves, accordions, leaderboards, shares of a whole, carousels, badges, toasts, ratings, countdowns, repeats, avatar stacks and confirmations become options, so the model has no new ids to tell apart |
| **Kept** (25) | Everything else (`TabBar` gains count badges from code only) | Already covers its need with a clear `pick` |

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
  of 16 app categories. `Ring` is one goal; stacking rings to fake it looks wrong.
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
| Line chart over many points | Up to 7 values: `Bars`; up to 12 as a small trend: `Stats` style `trend`; longer series: data `LineChart`, health `Measurements` |
| Avatar, avatar group | `Profile`, and `People` style `stack` |
| Badge | `List` trail `badge` (built), new `badge` on `Card`, counts on `TabBar` from code |
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
| Onboarding, paywall | Archetypes (`onboarding`, new `plans`) built from `Hero`, `Steps`, `Choice`, `Button` |
| Filter bar with sort | `Chips` in the core; `FilterBar` in the `data` pack |
| Divider, spacer, layout grids | The screen's rhythm table (plan 5.6) owns spacing |
| Floating add button | `Button` (one primary per screen, bottom region) |
| Spinner, skeleton | The kit draws `loading` for every component; never written by a model |
| PIN or code entry, colour picker, signature pad | Rare outside one domain; `Canvas` until misses ask |

## 2. New components

### `Sheet` · new · action · phone · overlay · weight 0

A panel that rises from the bottom over the current screen, dims what is behind it, and closes by a swipe
down, a tap outside or its close button. It is the only component outside the screen's flow: it lives in
the new `overlay` region, at most one per screen, hidden until something opens it. It never holds other
components, only its own items, so screens stay flat.

- **Pick:** more about one item without leaving the screen, picking from six or more options, or a few
  extra actions behind the header. Not a message that stays on the screen (`Banner`), not 2 to 5 options
  shown inline (`Choice`, `Chips`), not a whole new task (a new screen through `goto`), not confirming a
  dangerous press (`Button` with `confirm`).
- **Writes:** `title` text(40), `sub` text(100) optional, `style`, and per style:
  - `detail`: `pairs` of label text(20), value text(28), 1–6; `action` (label text(24), `goto`) optional.
  - `picker`: `label` text(24) (what is chosen), `options` of label text(28), meta text(36) optional and
    icon optional, 6–12, `at` optional. The choice is stored on the record like a `Field` `choice`.
  - `menu`: `items` of icon, label text(20), `goto`, `danger` boolean, 2–6.
- **Parts → actions:** root `dismiss`; detail `action press`; picker items `root select`; menu items
  `root press`.
- **Opening it:** `goto` gains the value `sheet` (this screen's sheet) everywhere a screen id is allowed:
  the `Header` action, `Button`, `List` rows, `Card`. A flow step can open it too.
- **States:** filled. · **Real path:** a local overlay on the current screen.
- **Aliases:** modal, dialog, popup, bottomsheet, actionsheet, overflow.
- **Read:** printed under the screen only while open, with the runtime mark `open` (plan 4.12 `marks`):
  `s1 Sheet[picker] "Repeat"`.
- **Kit work:** `KitSheet` (grabber, title, content, safe area, `sheet` elevation, spring `gentle`), the
  `overlay` region in `Screen`, a focus trap, `dismiss` in the interaction store, `screenId` accepting
  `sheet`.

### `Composer` · new · input · phone · body · weight 2

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
- **States:** filled, empty (the hint shows), success (reply: the sent text joins the conversation).
- **Tier:** `phone`; the `send` part of `reply` reads `!needs-people` through a new optional
  `meta.partTiers` (`{ send: "people" }`), because a reply only matters when someone else reads it.
- **Real path:** the text is saved to one record on the device; a reply goes through the same shared app as
  the conversation above it.
- **Aliases:** textarea, editor, notes, messagebox, reply, multiline.
- **Kit work:** `KitTextArea` (grows with content, keyboard-safe, role textbox multiline), `KitSend`; copy
  `charLine(n, max)` and the send label. The kit pins `reply` above the keyboard.

### `Progress` · new · data · phone · body · weight 2

One to five labelled bars, each filled toward its own target, with the amount and target written beside it.
A bar past its target turns to its `over` tone.

- **Pick:** progress toward several targets at once (calories, protein, carbs; spent against budget per
  category; lessons per course). Not one main goal (`Ring`), not amounts compared with each other with no
  targets (`Bars`), not place in a sequence of steps (`Steps`).
- **Writes:** `bars` of `label` text(20), `value` number ≥ 0, `of` number > 0, `unit` text(8) optional,
  `over` (`warn` default, `good`, `bad`), `goto` optional, 1–5; `style`.
- **Styles:** `stack` (label left, amount right, a full-width bar under each), `compact` (label and bar on
  one tight line each, for a short strip between other components).
- **Parts → actions:** items `root press` (linked bars only). · **States:** filled, empty, loading.
- **Real path:** amounts summed from records on the device, each compared with a target stored there.
- **Aliases:** progressbar, meter, gauge, targets, macros.
- **Read:** `"Protein" 62 of 120 g · "Carbs" 180 of 200 g`.
- **Kit work:** `KitProgressBar` (track `$line`, fill `$accent` or tone, clamped), a `progress` skeleton.

### `Choice` · new · input · phone · body · weight 2

Two to five options stacked as large tappable cards or rows, each with a title, a sentence under it, an
optional icon and an optional value on the right (a price, a duration). The chosen card takes an accent
ring and a tick. With `multi`, several can be chosen.

- **Pick:** choosing among a few options that each need a sentence to explain: a plan, an answer to a
  question, a way of doing something, an onboarding question. Not a few one-word options (`Chips`), not a
  short value inside a form (`Field` kind `choice`), not switching views (`Segmented`), not keep-or-skip one
  at a time (`SwipeStack`), not six or more options (`Sheet` style `picker`).
- **Writes:** `question` text(60) optional, `options` of `title` text(28), `sub` text(80) optional, `icon`
  optional, `value` text(16) optional, `badge` text(12) optional ("Most popular"), `on` boolean (with
  `multi` only), 2–5; `at` index (without `multi`); `multi` boolean (default false); `style`.
- **Styles:** `cards` (default), `list` (rows with a radio or tick on the left, for longer questions).
- **Parts → actions:** items `root select` (with `multi`: `toggle`). · **States:** filled.
- **Real path:** the chosen option is stored on one record on the device.
- **Aliases:** options, plans, pricing, radio, multiplechoice.
- **Kit work:** `KitOption` (card or row, selected ring, badge corner, role radio or checkbox).

### `Amount` · new · data · phone · body · weight 2

One sum of money written properly: the currency symbol where the locale puts it, tabular digits, an
optional period ("/ month"), an optional old price struck through, and an optional change with an arrow in
`good` or `bad`.

- **Pick:** one sum of money is the point: a balance, a price, a total, what is owed. Not two to four
  figures side by side, even if they are money (`Stats`), not the headline in words (`Hero`), not a price
  on each row of a list (`List` trail `value`).
- **Writes:** `label` text(24) optional, `value` number, `currency` (from the catalog's `currency` enum of
  ISO 4217 codes; default from the app's locale), `per` (`none` default, `hour`, `day`, `night`, `week`,
  `month`, `year`, `each`, `person`), `was` number optional, `change` number optional (signed), `changeIn`
  (`money` default, `percent`), `sub` text(40) optional, `goto` optional, `style`.
- **Styles:** `large` (display size, centred: the screen's headline number), `inline` (label left, amount
  right, on its own row), `total` (a rule above, the label "Total" from copy unless `label` is given).
- **Parts → actions:** `root press` (when linked). · **States:** filled, loading.
- **Real path:** a sum computed on the device from stored records; no money moves (paying is a pack
  component with tier `service`).
- **Aliases:** price, balance, money, cost, sum.
- **Read:** `"Balance" €1,240.50 · down €32 this week`.
- **Kit work:** `moneyLine(value, currency, per)` in `catalog/copy.ts` over `Intl.NumberFormat`; the
  `currency` prop helper; `KitText role="number" tabular` draws it.

### `Player` · new · content · phone · body · weight 3

Plays one piece of audio or video: artwork or the video frame, title and source, a scrubber with elapsed
and remaining time, play and pause, and skip back and forward by 15 seconds. `audio` has square artwork and
large controls, `video` a 16:9 frame with controls over it, `compact` one row for audio.

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
- **Aliases:** audio, video, podcast, media, playback, nowplaying.
- **Read:** `"Evening wind-down" · 4:05 of 12:00 · paused`.
- **Kit work:** `KitScrubber` (role slider, `clockLine` labels), `KitMediaControls`, a `media` prop helper,
  and a media adapter behind the host interface (plan 5.3) so the kit never imports a player library.

## 3. Merged components

Both merges keep the drawing and the signature; only the id goes away. Each is gated by evidence: merge only
if the pair's near-miss `choose` probes are unstable on a required model, or the Critic logs the pair as a
repeated wrong pick. If both stay stable, keep both ids and close this section without merging.

| Old id | Becomes | Props mapping | Catalog work |
| --- | --- | --- | --- |
| `Sparkline` | `Stats` style `trend` | `label`, `value` text(10), `points` 3–12, `tone` become one tile | Stats `value` grows to text(10); a per-style tile count (1–2 in `trend`); `tone` per tile; aliases `trend`, `spark`, `linechart` move to `Stats` |
| `DayTimeline` | `Timeline` style `hours` | `blocks` of `start`, `end` (HH:MM), `title`, `tone`, `goto` become `items` | Per-style limits (up to 8 items, `time` as HH:MM, `end` required); `meta.weightByStyle` so `hours` keeps weight 3; signature `day_unfold` moves; aliases `dayplan`, `timeblocks`, `hourly`, `daily` move |

Migrations under `catalog/migrations/` rewrite old lines; recordings of the old ids retire in the same
commit.

### Alias clean-up

An alias has one owner and never equals another component's id. Two built aliases break that and change in
step C1: `choices` is on both `Chips` and `SwipeStack` (it stays with `Chips`; `SwipeStack` takes `keepskip`),
and `progress` on `Ring` equals the new `Progress` id (it moves off `Ring`). Pack aliases that shadow a core
alias on purpose are listed in each pack file.

## 4. The full core

### Structure (4)

### `Header` · built · structure · phone · top · weight 1
The screen's name at the top, as a large title, an inline title, or a back arrow with a title, with at most
one corner action.
- Pick: every screen that needs a name. Not the label of one group inside the screen (`SectionTitle`).
- Writes: `title` text(28), `sub` text(40) optional, `action` (icon, label text(16), `goto`) optional.
- Styles: `large`, `inline`, `back`. · States: filled. · Parts → actions: `action press` (may open `sheet`).
- Aliases: heading, topbar, navbar, screenheading.

### `SectionTitle` · built · structure · phone · body · weight 1
A small heading above a group of content, with one optional link on the right ("See all").
- Pick: label a group so the screen scans; names a `List` `shelf`. Not the screen's name (`Header`).
- Writes: `text` text(32), `link` (label text(16), `goto`) optional. · Parts → actions: `link press`.
- Aliases: sectionheading, grouplabel, groupheading, sectionlabel.

### `Steps` · built · structure · phone · top · weight 1
Where the person is in a short sequence: dots, a segmented bar or numbered circles, with an optional label.
- Pick: a flow of 2 to 6 screens. Not progress toward an amount (`Progress`, `Ring`).
- Writes: `count` 2–6, `at` 1–6, `label` text(32) optional. · Styles: `dots`, `bar`, `numbered`.
- Aliases: stepper, wizard, sequence, onboarding.

### `TabBar` · built · structure · phone · bottom · weight 1 · code-owned
Bottom navigation with 2 to 5 tabs, built by code from sections marked `nav`; never written by a model.
- Writes (code): `tabs` of icon, label text(12), `goto`, 2–5; `at`. **Change:** a count badge per tab from
  code (unread, due), never from the model.
- Parts → actions: items `root select`. · Aliases: bottomnav, navigation, maintabs, navtabs.

### Content (11)

### `Hero` · built · content · phone · body · weight 3
The one thing this screen says, as a large statement, a full-bleed photo with a title over it, or a big
number with a caption.
- Pick: one headline fact or message. Not one sum of money as the headline (`Amount` style `large`), not
  several numbers (`Stats`), not something to notice now (`Banner`).
- Writes: `title` text(40), `sub` text(80) optional, `photo` optional, `tone`.
- Styles: `statement`, `photo`, `number`. · States: filled, loading. · Aliases: headline, intro, spotlight.

### `Card` · changed · content · phone · body · weight 2
One thing with a little detail: title, body, meta, an icon or a photo (not both), optionally tappable.
- Pick: one featured thing to open. Not several things of a kind (`List`), not facts about one thing
  (`KeyValue`).
- Writes: `title` text(40), `body` text(120), `meta` text(24), `icon` or `photo`, `tone`, `goto`; **new**
  `badge` text(12) optional: a status pill in the top corner ("Paid", "Due today", "New").
- Styles: `plain`, `tinted`, `outlined`, `media`. · States: filled, loading. · Parts → actions: `root press`.
- Aliases: tile, summary, panel.

### `List` · changed · content · phone · body · weight 2
Several things of one kind as rows (title, meta, icon or photo, and a trail: chevron, check, switch, value
or badge), each tappable.
- Pick: several things of one kind to scan and tap. Not one featured thing (`Card`), facts about one thing
  (`KeyValue`), jobs to tick off (`Checklist`).
- Writes: `rows` of `title` text(28), `meta` text(36), `icon`, `photo`, `trail`, `value` text(10), `goto`,
  1–6; **new** `body` text(200) per row, in style `expand` only; **new** `me` boolean per row, in style
  `ranked` only (at most one).
- Styles: `plain`, `inset`, `cards`, **new** `shelf` (a sideways rail of 2–6 photo cards with the next one
  peeking, named by a `SectionTitle` above it: "Popular", "Continue", "Near you"), **new** `expand` (each row
  opens in place to show its `body`: FAQs, instructions), **new** `ranked` (rows numbered 1 to n in order,
  the top three marked, the `me` row tinted, `value` as the score: leaderboards for social, learning, health
  and sports).
- Parts → actions: items `root press` (`root toggle` in `expand`), `trail toggle`.
- States: filled, empty, loading. · Aliases: listview, table, rows, items, **new** shelf, rail, accordion, faq,
  leaderboard, ranking.

### `KeyValue` · built · content · phone · body · weight 2
Labelled facts about one thing in rows or a two-column grid.
- Pick: details of one thing (its room, schedule, size). Not one sum of money (`Amount`).
- Writes: `pairs` of label text(20), value text(28), icon, 1–6. · Styles: `rows`, `grid`.
- States: filled, empty, loading. · Aliases: attributes, details, properties, specifications.

### `Note` · built · content · phone · body · weight 1
One short sentence of supporting information, as body text, a quote or a hint.
- Pick: one sentence that helps. Not something urgent (`Banner`), not the person's own writing (`Composer`).
- Writes: `text` text(120), `tone`, `icon`. · Styles: `body`, `quote`, `hint`.
- Aliases: sentence, tip, aside, quotation.

### `Photo` · built · content · phone · body · weight 2
One picture with an optional caption; the style is its shape.
- Pick: one picture matters. Not several (`Gallery`), not a recording (`Player`).
- Writes: `photo`, `caption` text(80) optional. · Styles: `wide` (default), `square`, `tall`.
- States: filled, loading. · Aliases: picture, image, snapshot.

### `Gallery` · changed · content · phone · body · weight 3
Several pictures as a grid, a sideways strip, or a full-width carousel.
- Pick: several pictures together. Not one (`Photo`), not titled cards to open (`List` style `shelf`).
- Writes: `photos` of photo, caption text(24), `goto`, 2–6.
- Styles: `grid`, `strip`, **new** `carousel` (full width, one at a time, page dots: product, listing and
  place photos).
- Parts → actions: items `root press`. · States: filled, empty, loading.
- Aliases: album, photogrid, filmstrip, **new** carousel, slideshow.

### `Profile` · built · content · phone · top · weight 2
Who or what this screen is about: a photo, a name and a meta line, as a row or centred.
- Pick: the identity of the person, pet, plant or thing. Not other people involved (`People`).
- Writes: `name` text(32), `meta` text(48), `photo`. · Styles: `row`, `centered`. · States: filled, loading.
- Aliases: identity, portrait, bio.

### `Banner` · built · content · phone · top · weight 2
A tinted strip near the top with an icon and a sentence that needs attention now, optionally tappable.
- Pick: something to notice now (overdue, offline, a change). Not a helpful sentence (`Note`), not an offer
  (commerce `Promo`).
- Writes: `text` text(80), `icon`, `tone` (default `warn`), `goto`. · Aliases: notice, notification, alert,
  announcement.

### `Empty` · changed · content · phone · body · weight 2
A calm, centred message on a screen with nothing in it yet, with an icon badge.
- Pick: there is no content yet, or loading it failed. Not a sentence beside content (`Note`).
- Writes: `title` text(40), `sub` text(100), `icon`; **new** `kind` (`none` default, `error`, `offline`)
  and **new** `goto` for the next step.
- Parts → actions: **new** `retry press` (error, offline), `root press` (with `goto`).
- Aliases: blank, absence, unstarted, **new** error, offline.

### `Player` · new · content · phone · body · weight 3
See section 2.

### Data (9)

### `Stats` · changed · data · phone · body · weight 2
Two to four numbers as tiles or one inline row, each with a label, unit and an optional trend arrow.
- Pick: a few summary numbers side by side, money included. Not one sum as the point (`Amount`), not one goal
  (`Ring`), not targets per category (`Progress`).
- Writes: `tiles` of label text(20), value text(8, **new** 10), unit text(8), trend, 2–4; **new** in style
  `trend`: 1–2 tiles, each with `points` 3–12 and `tone`.
- Styles: `tiles`, `inline`, **new** `trend` (a small line of recent values under each number; replaces
  `Sparkline` if section 3 merges it).
- States: filled, empty, loading. · Signature: `count_up`. · Aliases: metrics, totals, figures.

### `Ring` · built · data · phone · body · weight 2
A ring filling toward one goal with the amount written inside.
- Pick: how far toward one main goal. Not several targets (`Progress`), not a sequence (`Steps`).
- Writes: `value`, `of`, `label` text(24), `sub` text(48). · Styles: `md`, `lg`. · States: filled, loading.
- Signature: `ring_fill`. · Aliases: goal, completion (**change:** `progress` moves off `Ring` when the
  `Progress` component is built, since an alias may not equal another component's id).

### `Bars` · changed · data · phone · body · weight 2
Two to seven columns comparing amounts across days or categories under a title, the largest in accent; or
one bar split into shares of a whole with a legend.
- Pick: compare amounts with each other, or show how a whole splits into parts. Not progress toward targets
  (`Progress`), not a trend (`Stats` style `trend`).
- Writes: `title` text(32), `unit` text(8), `points` of label text(4), value ≥ 0, 2–7; **new** in style
  `share`: labels up to text(16), 2–6 points, an `icon` per point; shares and the total are computed by code.
- Styles: **new** `columns` (default, as built), **new** `share` (one stacked bar the full width, the
  total above it, and a legend of label, value and percent, largest first: spending by category, time by
  project, votes by option; replaces the first plan's money `Spending` and data `Donut`).
- Parts → actions: **new** `share` legend items `root press`. · States: filled, empty, loading.
- Signature: `bars_grow`. · Aliases: columns, histogram, barchart, **new** breakdown, share, pie, donut.

### `Progress` · new · data · phone · body · weight 2
See section 2.

### `Amount` · new · data · phone · body · weight 2
See section 2.

### `Timeline` · changed · data · phone · body · weight 2
Things in time order with a time column, as a day plan or a history, or as blocks on an hour rail.
- Pick: when things happen, in order. Not which days have something (`Calendar`), not jobs (`Checklist`).
- Writes: `items` of `time` text(12), `title` text(32), `meta` text(32), `done`, 1–6; **new** in style
  `hours`: up to 8 items with `time` and `end` as HH:MM, `tone` and `goto`.
- Styles: `day`, `history`, **new** `hours` (blocks sized by their length so gaps show; replaces
  `DayTimeline` if section 3 merges it). · States: filled, empty, loading.
- Signature: `day_unfold` (on `hours`). · Aliases: chronology, agenda, history.

### `Calendar` · built · data · phone · body · weight 3
A week strip or a month grid with marked days in a tone and one selected day.
- Pick: which days have something, and opening a day. Not what happens within a day (`Timeline`).
- Writes: `month` text(16), `marked` of day 1–31 and tone, 0–12, `selected` optional, `start`, `days`.
- Styles: `week`, `month`. · Parts → actions: items `root select`. · Signature: `calendar_sweep`.
- Aliases: dates, monthgrid, weekgrid, daypicker.

### `Counter` · built · data · phone · body · weight 2
One number nudged up or down by a fixed step with large minus and plus buttons.
- Pick: keep one running count (glasses of water, laps). Not a quantity on a product (commerce `Product`).
- Writes: `label` text(24), `value` int ≥ 0, `unit` text(8), `step` 1–100.
- Parts → actions: `minus decrement`, `plus increment`. · Aliases: tally, count, quantity.

### `Timer` · changed · data · phone · body · weight 2
A large clock counting down or up with start and stop, or the time left until a date.
- Pick: time an activity now, or count down to a date. Not a recording to play (`Player`).
- Writes: `label` text(24), `seconds` 0–86400; **new** `until` (date `YYYY-MM-DD`, optional `HH:MM`) in
  style `until`.
- Styles: `down`, `up`, **new** `until` (days, hours and minutes left: a trip, a wedding, a deadline; no
  start or stop). · Parts → actions: `start`, `stop` (not in `until`). · Signature: `timer_spin`.
- Aliases: countdown, stopwatch, duration.

### Input (8)

### `Field` · changed · input · phone · body · weight 1
One labelled piece of information: text, number, date, time, a choice, a toggle, a slider or a photo.
- Pick: one value on a form. Not several lines of writing (`Composer`), not options that need a sentence
  each (`Choice`).
- Writes: `kind`, `label` text(24), `value` text(40), `hint` text(60), `options` text(16), 2–4 (choice
  only); **new** kind `repeat` (value `never`, `daily`, `weekdays`, `weekly`, `monthly`, `yearly`) for
  reminders, chores, medication and care schedules.
- Parts → actions: `field` `type`, `select`, `toggle`, `set` or `press` (photo) by kind.
- Tier: kind `photo` needs the person's OK. · Aliases: input, formfield, entry, **new** repeat.

### `Chips` · built · input · phone · body · weight 1
A wrapping row of two to six short pills to filter, or to pick one.
- Pick: filter, or pick among a few one-word options. Not options needing a sentence (`Choice`), not
  switching views (`Segmented`).
- Writes: `items` of label text(16), on, icon, 2–6. · Styles: `filter`, `choose`.
- Parts → actions: items `root toggle` or `select`. · Aliases: pills, filters, choices.

### `Segmented` · built · input · phone · top · weight 1
A tinted track of 2 to 4 equal segments that switches between views of the same screen.
- Pick: switch between views (Day, Week, Month). Not filtering a list (`Chips`).
- Writes: `options` of label text(14), 2–4, `at`. · Aliases: segments, viewswitch, viewpicker, viewtabs.

### `Checklist` · built · input · phone · body · weight 2
Up to six jobs with tick boxes; ticking one strikes it through.
- Pick: things to do and tick off. Not things to scan and open (`List`), not quiz answers (`Choice`).
- Writes: `items` of text text(36), done, meta text(24), 1–6. · Parts → actions: items `check check`.
- States: filled, empty, loading. · Signature: `check_burst`. · Aliases: tasks, todo, ticks, checks.

### `Search` · built · input · phone · top · weight 1
A search box with a magnifier and a hint.
- Pick: find one thing among many by name. Not writing text (`Composer`).
- Writes: `hint` text(40). · Parts → actions: `field type`. · Aliases: searchbox, searchbar, lookup, find.

### `Scale` · changed · input · phone · body · weight 2
Five faces, stars or dots to log a level from one to five, or stars that show a rating.
- Pick: log a level or feeling 1 to 5, or show how something is rated. Not a number with a unit
  (`Counter`, `Field` kind `slider`).
- Writes: `label` text(32), `value` 0–5; **new** in style `stars` only: `readonly` boolean, with `value`
  0–5 in steps of 0.5 and `meta` text(24) ("4.6 · 212 reviews").
- Styles: `dots` (default), `mood`, `stars`. · Parts → actions: `l1`…`l5 select` (none when `readonly`).
- Aliases: rating, mood, score, level.

### `Choice` · new · input · phone · body · weight 2
See section 2.

### `Composer` · new · input · phone · body · weight 2
See section 2.

### Action (4)

### `Button` · changed · action · phone · bottom · weight 1
The one thing to do next as a full-width button (`primary` at most once per screen), or a quieter one.
- Pick: the main thing the person does. Not 2 to 4 shortcuts (`Actions`).
- Writes: `label` text(24), `kind`, `icon`, `goto` (a screen id or **new** `sheet`); **new** `confirm`
  text(60) optional: pressing first shows a standard confirm sheet with this sentence, a confirm button in
  the button's tone and cancel. The kit draws it; it is not a `Sheet` component and does not count against
  the one-sheet rule.
- Kinds: `primary`, `secondary`, `quiet`, `danger`. · Parts → actions: `root press`.
- Aliases: button, cta, submit, action.

### `Actions` · built · action · phone · body · weight 2
Two to four shortcuts as icon tiles.
- Pick: a few different things the person can do next. Not the one main thing (`Button`), not a menu of
  extra actions (`Sheet` style `menu`).
- Writes: `items` of icon, label text(16), `goto`, 2–4. · Parts → actions: items `root press`.
- Aliases: shortcuts, quickactions, quicklinks.

### `Success` · changed · action · phone · body · weight 2
Proof something worked: a large tick, a title and a line; or a toast at the bottom for a few seconds with an
optional undo.
- Pick: confirm an action worked. Not news to notice later (`Banner`).
- Writes: `title` text(40), `sub` text(100), `icon`; **new** `undo` boolean (toast only).
- Styles: **new** `screen` (default, as built), **new** `toast`. · Parts → actions: **new** `undo press`,
  `root dismiss` (toast).
- Aliases: confirmation, completed, receipt, **new** toast, snackbar.

### `Sheet` · new · action · phone · overlay · weight 0
See section 2.

### Beyond phone (4)

### `Camera` · built · beyond · ok · body · weight 3
A dark viewfinder with a hint and a shutter, for a photo or a scan.
- Pick: point the camera at something now. Not choosing an existing photo (`Field` kind `photo`).
- Writes: `kind` (`photo`, `scan`), `hint` text(48). · Parts → actions: `shutter press`.
- Aliases: capture, viewfinder, shutter.

### `MapPins` · built · data · service · body · weight 3
A stylised map with up to five numbered pins and the places listed under it.
- Pick: where a few places are. Not the path between them (`Route`).
- Writes: `pins` of label text(24), `goto`, 1–5. · States: filled, loading.
- Aliases: map, locations, nearby, places.

### `Bubbles` · built · content · people · body · weight 2
A conversation as chat bubbles, mine on the right in accent, theirs on the left.
- Pick: a conversation between people. Not comments under a post (social `Comments`).
- Writes: `messages` of from (`me`, `them`), text text(120), 1–6; `with` text(24). · States: filled, empty.
- Change: none to the component; the `chat` archetype adds `Composer` style `reply` after it.
- Aliases: chat, conversation, thread.

### `People` · changed · content · people · body · weight 2
Who else is part of this, as rows with avatar, name and role, or as an overlapping stack.
- Pick: other people involved. Not the one person this screen is about (`Profile`).
- Writes: `members` of name text(24), role text(24), photo, `goto`, 1–6; **new** `more` number (shown
  "+3" through `moreLine`).
- Styles: **new** `rows` (default, as built), **new** `stack` (overlapping avatars with a count:
  assignees, attendees, shared with). · States: filled, empty.
- Aliases: members, participants, household, team.

### Signature (3)

### `SwipeStack` · built · content · phone · body · weight 3
A stack of cards; the top one swipes right to keep and left to skip.
- Pick: decide on things one at a time. Not options side by side (`Choice`).
- Writes: `cards` of title text(32), photo, meta text(24), 2–6. · Parts → actions: items `root swipe`.
- Signature: `card_swipe`. · Aliases: deck, swipe, choices.

### `Streak` · built · data · phone · body · weight 2
Days in a row as a big count, with this week's days marked.
- Pick: a habit kept day after day. Not a count with no days (`Counter`).
- Writes: `count`, `label` text(24), `days` exactly 7 booleans. · Signature: `streak_flame`.
- Aliases: habit, consecutive, consistency.

### `Route` · built · data · service · body · weight 2
A path drawn through stops from start to end, with an optional distance.
- Pick: a journey through stops. Not places without a path (`MapPins`), not a trip plan by day (trips
  `Itinerary`).
- Writes: `stops` of label text(24), meta text(16), 2–6; `distance` text(12). · Signature: `route_draw`.
- Aliases: journey, circuit, itinerary.

### Escape (1)

### `Canvas` · built · escape · phone · body · weight 3
A framed area for an idea the library cannot express (a game, a drawing tool), with a caption. Every use is
logged as a miss and feeds the catalog review.
- Writes: `caption` text(80). · Aliases: custom, bespoke, unrepresented.

## 5. Archetypes

All seventeen core archetypes are implemented as data. `defaultLines` validates every layout, and `runComposeProbes` scores required slots, screen rules and the text-first rubric.

| Archetype | Change | Recipe |
| --- | --- | --- |
| `chat` | Uses `Composer` | Header, Bubbles, Composer[reply] |
| `journal` | New layout `write` | `entries`: Header, Card, Button · `write`: Header, Field[date], Scale[mood], Composer[entry], Button |
| `onboarding` | May ask a question | Hero, Note, Steps, Choice \| Button |
| `plans` | **New**: pricing and upgrade | Header, Hero, Choice (with `value`), Note, Button |
| `browse` | **New**: shelves to explore | Header, Search, Chips, SectionTitle, List[shelf], SectionTitle, List[shelf] |

## 6. Screen rules added

- At most one `Sheet` per screen, region `overlay`; something on the screen opens it (a `goto: sheet`)
  unless a flow step does. It does not count toward the screen's weight.
- At most one `Choice`, one `Player` and one `Composer` per screen; `Composer[reply]` comes last in the body,
  after `Bubbles` or `Comments`.
- At most one `Amount[large]` per screen, never together with `Hero[number]`.
- A `Button` with `kind: danger` and no `confirm` raises an issue (rules never repair, plan 4.5); the repair
  stage then fills `confirm` from copy.

## 7. Build order

| Step | Builds | Gate |
| --- | --- | --- |
| C1, options (1 week) | `Field` repeat, `Timer` until, `Scale` readonly, `People` stack, `Gallery` carousel, `List` shelf, expand and ranked, `Bars` share, `Card` badge, `Success` toast, `Empty` kinds | Each changed component re-passes `pnpm llm:check --component <Id>` with probes for the new option; examples cover every new value |
| C2, simple new (1.5 weeks) | `Progress`, `Amount`, `Choice`, `Composer` with `KitProgressBar`, `moneyLine`, `currency`, `KitOption`, `KitTextArea`, `meta.partTiers` | Gate per component; near-miss probes against `Ring`, `Stats`, `Chips`, `Field` pass |
| C3, overlays and media (1.5 weeks) | `Sheet` with the `overlay` region and `dismiss`, `goto: sheet`, `Button` confirm; `Player` with the `media` helper, the host media adapter and `play`, `pause`, `seek` | Agent end-to-end: open, pick and dismiss a sheet, and confirm a danger button, through `window.__lmthingUI.act`; play and seek a fixture recording |
| C4, merges (0.5 week) | `Sparkline` and `DayTimeline` folded, with `meta.weightByStyle` and per-style limits, if section 3's evidence says so | Migrations rewrite every fixture; no recording refers to the old ids |

New copy for `catalog/copy.ts`: send, cancel, confirm, close, undo, retry, offline, "See all", `moneyLine`,
`charLine`, period words (per night, per month), `moreLine(n)` ("+3"), `leftLine` ("3 days left").

## 8. Open questions, with the default to build

- **Does `Sheet` break flat screens?** Default: no. It holds its own items, never other components, and
  reads as one line while open.
- **Should `Player` stream?** Default: files on the device only (tier `phone`). Streaming is a media-pack
  concern with tier `service`.
- **Merges now or later?** Default: later, decided by section 3's evidence.
- **Is 44 too many for the cheapest model?** Default: no, because overlap is what hurts. Re-measure with the
  choose probes after C2: if any near miss turns unstable, fix the `pick` lines before adding anything else.

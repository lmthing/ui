# `comics` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Sequential art and serialized chapters: vertical webtoon and manga readers, series banners, timed/coin chapter gates, Mon–Sun release calendars, chapter wallets and series shelves. Not prose/audio libraries (`media`).

## Purpose

Reading serialized webtoons and manga, inspecting series details and weekly release cadences, unlocking chapters via free drops, wait-timers, daily passes or coins, and tracking subscribed series and unread chapters on a shelf. Designed for sequential visual panels and chapter-unlock mechanics, not prose ebooks or podcast playlists.

## Apps it serves

Vertical-scroll webtoon app, manga reader (LTR and RTL spreads), serialized comic publisher app, offline comic shelf reader, weekly episode release calendar, coin/wait-free chapter unlock store.

## What the core already covers

- Prose light novels and creator notes: `Article`; audio commentary: `Player[audio]`; 2–6 standalone illustrations: `Gallery[tall]`.
- Browsing editorial shelves and search: `List[shelf]`, `Search`, `Chips`, `FilterBar`.
- Series ratings and reader reviews: `Review`; creator profiles: `Profile`; episode drop reminders: `Field[repeat]`.

Separate `ComicSearch`, `GenreDirectory` and `DownloadQueue` components are dropped: discovery filters use core `Search` + `Chips`, and download toggles live inside `EpisodeGate` and `ComicShelf`. `ComicReader` earns its place with a continuous vertical webtoon strip or LTR/RTL manga page snap viewer (`KitPanelStrip`) and tap HUD; `SeriesHeader` shows serialization cadence (`"Every Thu"`), `UP`/`Completed` pills and `"Continue Ep. N"`; `EpisodeGate` handles `Free`, `Wait Free`, `Daily Pass` and `Coin` unlock badges; `ReleaseSchedule` maps Monday–Sunday recurring serialization drops; `ChapterWallet` tracks coins and Wait-Until-Free recharge timers; and `ComicShelf` tracks unread `+N` badges across subscribed series.

## Components (6)

### `ComicReader` · planned · content · phone
Sequential comic panels rendered as a continuous gapless vertical webtoon strip or paginated left-to-right or right-to-left manga spreads. Tapping the reader toggles a minimal overlay HUD with episode title, panel/page progress scrubber, direction indicator and a Next Episode footer.
- Pick: reading sequential comic, manga or webtoon chapters. Not formatted prose (`Article`), 2–6 standalone photos (`Gallery`), or video streams (`Player`).
- Writes: `episodeId` text(32), `seriesTitle` text(40), `episodeTitle` text(40), `panels` of `image` photo, `alt` text(80) optional, 1–30; `direction` (`vertical`, `ltr`, `rtl`), `nextEpisodeId` text(32) optional, `nextEpisodeTitle` text(40) optional, `style`. Current panel cursor and reading percentage are runtime state; `rtl` reverses spread navigation order without duplicating images.
- Styles: `strip` (default, seamless vertical webtoon scroll), `paged` (horizontal LTR/RTL page snaps).
- Parts → actions: `hud toggle` (tap reader canvas), `scrubber seek` (panel index 1..N), `prev press`, `next press`, `nextEpisode press`.
- States: filled, empty, loading, error (panel asset failed to load).
- Real path: renders cached offline panels or streams panel assets via `KitPanelStrip` from the publisher catalog.
- Density: `meta.dense: true`, weight 3; sequential chapters hold up to 30 ordered panel assets.

### `SeriesHeader` · planned · content · phone
Showcase banner at the top of a serialized comic or manga page: cover artwork, title, creator, genre tags, release cadence (`"Every Thu"`), `UP` or `Completed` status pill, synopsis, Subscribe toggle and a primary Start or `"Continue Ep. 42"` button.
- Pick: the showcase header of one serialized comic or manga series. Not a book or podcast collection (media `Collection`), generic headline (`Hero`), or user profile (`Profile`).
- Writes: `seriesId` text(32), `title` text(40), `creator` text(32), `cover` photo, `genres` text(16) each 1–3, `cadence` text(24), `status` (`ongoing`, `hiatus`, `completed`), `updatedToday` boolean (default false), `summary` text(240), `subscribed` boolean (default false), `resumeLabel` text(24) optional, `resumeGoto` optional, `style`. `UP` and status badges derive from `status` and `updatedToday`.
- Styles: `banner` (default, full cover art and synopsis), `compact` (condensed header bar).
- Parts → actions: `subscribe toggle`, `resume press` (to `resumeGoto`).
- States: filled, loading.
- Real path: series metadata stored locally or fetched from the comics service; subscribing updates the reader's shelf.

### `EpisodeGate` · planned · content · phone
Numbered chapter or episode rows showing thumbnail, episode number, title, release date, like count, read dimming on finished chapters, offline download toggle and unlock state pill (`Free`, `Wait Free` countdown, `Daily Pass` or `Coin` lock cost).
- Pick: serialized chapters with free, wait-timer, daily-pass or coin unlock gates. Not free audio tracks (media `Playlist`), book timestamps (media `ChapterList`), or TV seasons (watch `SeasonEpisodes`).
- Writes: `seriesId` text(32), `episodes` of `episodeId` text(32), `number` integer ≥ 1, `title` text(32), `thumb` photo, `date`, `likes` integer ≥ 0, `read` boolean (default false), `downloaded` boolean (default false), `gate` (`free`, `wait_free`, `daily_pass`, `coins`), `coinCost` integer 1–999 optional (coins only), `waitReadyAt` ISO datetime with offset optional (wait_free only), `goto` optional, 1–24; `style`. Wait countdowns and unlock availability are computed.
- Styles: `list` (default, numbered rows with thumbnails and unlock pills), `compact` (dense title and gate badge rows).
- Parts → actions: episodes `root press` (opens unlocked chapter or triggers unlock), episodes `unlock press`, episodes `download toggle`. `meta.partTiers: { unlock: "service", download: "service" }`; `meta.confirmParts: ["unlock"]`.
- States: filled, empty, loading, success (chapter unlocked), error (insufficient coins or timer still cooling down).
- Real path: tracks local read/download state on the device and synchronizes timed or coin chapter unlocks with the publisher entitlement service.
- Density: `meta.dense: true`, weight 3; serialized series display up to 24 chapter rows with gate states.

### `ReleaseSchedule` · planned · data · phone
Seven-weekday tab strip (`Mon–Sun`) highlighting today and showing ongoing series dropping on that weekday as cover tiles with `UP` update badges, unread dots and genre tags. Selecting a tile opens its series page.
- Pick: recurring Monday–Sunday serialization release calendars. Not calendar month dates (`Calendar`), school class blocks (learning `Timetable`), or live TV channel grids (watch `ChannelGuide`).
- Writes: `selectedDay` (`mon`, `tue`, `wed`, `thu`, `fri`, `sat`, `sun`), `entries` of `seriesId` text(32), `day` (`mon`, `tue`, `wed`, `thu`, `fri`, `sat`, `sun`), `title` text(32), `cover` photo, `genre` text(16), `updatedToday` boolean (default false), `unread` boolean (default false), `goto`, 1–21; `style`. Day filtering and drop counts per weekday are computed.
- Styles: `grid` (default, three-column cover tiles under weekday tabs), `rows` (release rows with genre and update pill).
- Parts → actions: days `root select`, entries `root press`.
- States: filled, empty (no drops on selected day), loading.
- Real path: weekly drop schedule derived from stored series cadences on the phone or synced from the publisher catalog.
- Density: `meta.dense: true`, weight 3; seven weekday tabs filtering up to 21 series tiles.

### `ChapterWallet` · planned · data · service
Reader's chapter-unlock wallet showing current coin/ink balance, Daily Pass balance, active "Wait Until Free" recharge countdown bars per series, and top-up or rewarded ad-watch actions.
- Pick: managing chapter-unlock coins, daily passes and wait-free timers. Not real bank accounts (money `AccountCard`), event tickets (ticketing `TicketWallet`), or café stamps (customers `Loyalty`).
- Writes: `coins` integer ≥ 0, `currencyLabel` text(16) (default "Coins"), `dailyPasses` integer ≥ 0, `waitTimers` of `seriesId` text(32), `seriesTitle` text(32), `readyAt` ISO datetime with offset, `goto` optional, 0–6; `adAvailable` boolean (default false), `topUpGoto` optional, `style`. Recharge countdowns and ready badges are computed from `readyAt`.
- Styles: `wallet` (default, balances and active wait-free timers), `compact` (inline coin and pass balance strip).
- Parts → actions: `topUp press` (to `topUpGoto`), `watchAd press` (when `adAvailable`), waitTimers `root press`.
- States: filled, empty, loading, success (coins or pass credited), error (wallet sync failed).
- Real path: virtual coin balances, passes and recharge timers reconcile with the publisher wallet service across devices.

### `ComicShelf` · planned · content · phone
Subscribed and downloaded series grid or list showing cover art, title, unread chapter badge (`+3`), update dot, last-read episode label and a quick jump to the next unread chapter.
- Pick: tracking subscribed comics, unread episode counts and offline downloads. Not prose/audio book grids (media `Library`), generic lists (`List`), or owned belongings (inventory `Things`).
- Writes: `items` of `seriesId` text(32), `title` text(32), `cover` photo, `unreadCount` integer 0–999, `updatedToday` boolean (default false), `lastEpisode` text(16) optional, `downloadedCount` integer ≥ 0 (default 0), `goto`, 1–18; `style`. Total unread count is computed; badges format unread drops as `+N`.
- Styles: `grid` (default, cover tiles with `+N` unread badges), `rows` (list with last-read episode and quick jump).
- Parts → actions: items `root press`, items `resume press`, items `remove press`. `meta.confirmParts: ["remove"]`.
- States: filled, empty, loading.
- Real path: subscriptions and downloaded chapters persist locally on the device and optionally sync with a reader account.
- Density: `meta.dense: true`, weight 3; cover shelf displays up to 18 subscribed series.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `comic_discover` | Browse weekly drop calendar and curated shelves | `comics_daily`, `comics_browse` | `comics_daily`: Header, Chips, ReleaseSchedule, Note · `comics_browse`: Header, Search, Chips, List[shelf], Note |
| `comic_series` | Inspect one series and unlock episodes | `comics_episodes` | `comics_episodes`: Header[back], SeriesHeader, EpisodeGate, Note |
| `comic_read` | Read vertical webtoons or RTL/LTR manga | `comics_strip`, `comics_paged` | `comics_strip`: Header[back], ComicReader[strip], Note · `comics_paged`: Header[back], ComicReader[paged], Button |
| `comic_shelf` | Track subscriptions, unread badges and coins | `comics_subscribed`, `comics_passes` | `comics_subscribed`: Header, Segmented, ComicShelf, Stats · `comics_passes`: Header[back], ChapterWallet, KeyValue, Button |

The first listed layout is each `defaultLayout`; all layout ids are `comics_`-prefixed and unique. Recipes use only core plus `comics`, keep every screen at 3–5 components, total weight at most 7, and at most one dense/weight-3 component per screen.

## Worked example: InkScroll

A serialized webtoon and manga reader, independent of Ledge and Trot. `comic_discover/comics_daily` opens on Thursday with seven ongoing titles; tapping **Starlight Courier** opens `comic_series/comics_episodes`, where `SeriesHeader` shows `"Every Thu"`, `UP`, and `"Continue Ep. 42"`. Below it, `EpisodeGate` lists Episode 43 as `Wait Free` (3h left), Episode 44 locked behind `3 Coins`, and Episodes 1–42 dimmed as read.

Tapping Episode 42 launches `comic_read/comics_strip`, rendering 18 seamless vertical panels through `KitPanelStrip` with a tap-toggled progress HUD and `"Next Episode"` footer. `comic_shelf/comics_subscribed` shows six followed comics with `+3` and `+1` unread badges alongside core `Stats` (`count_up` on chapters read this week, the app's single signature), while `comics_passes` tracks 15 coins, 2 Daily Passes and active Wait-Until-Free recharge bars.

## Tiers

`ComicReader`, `SeriesHeader`, `EpisodeGate` (for local read/free chapters), `ReleaseSchedule` and `ComicShelf` work on the phone once downloaded or cached. `ChapterWallet` balances and paid/timed `EpisodeGate` unlocks require a publisher entitlement service (`service`). Reader comments combine `comics` with `social` at app level rather than duplicating comment threads.

## Build notes

- Order: `SeriesHeader`, `EpisodeGate`, `ComicReader`, `ReleaseSchedule`, `ComicShelf`, `ChapterWallet`; all remain planned.
- `ComicReader` requires the new shared kit base `KitPanelStrip` (seamless vertical webtoon scroll and horizontal LTR/RTL snap pager); the other five components compose from existing kit bases (`KitCard`, `KitRow`, `KitGrid`, `KitPhoto`, `KitTrack`, `KitChip`, `KitTrail`, `KitMeter`, `KitTime`, `KitText`, `KitAction`).
- `ComicReader`, `EpisodeGate`, `ReleaseSchedule` and `ComicShelf` are `dense` (`weight 3`); `SeriesHeader` and `ChapterWallet` are weight 2.
- Writers use strict `writerFormat(registry)` for core plus `comics`; no aliases or off-pack fallbacks. Never write computed countdown strings, unread totals or coin deductions into props.
- Each component later ships two domain examples, choose/write/read probes and declared part/state tests, plus a three-preset `example.jsonl`.

## Open questions

- **Vertical micro-drama video episodes?** Default: keep sequential image chapters in `comics`; video episode gates in streaming apps belong to `watch` or host adapters.
- **Episode comments and creator tipping?** Default: episode discussions compose `social/Comments` when `comics` and `social` load together; coin unlocks stay inside `EpisodeGate` and `ChapterWallet`.
- **New action names?** None. HUD toggle uses `toggle`, panel scrubber uses `seek`, navigation and unlocks use `press`, weekday tabs use `select`.

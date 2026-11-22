# `watch` pack

**Status:** planned · **Wave:** 6 · **Pick line:** TV, film and cinema: series seasons, live TV guides, watch queues, TV remotes, showtimes and auditorium seat picking. Not audio/book libraries (`media`), not one local recording (`Player`).

## Purpose

Video streaming, multi-season TV series, live electronic program guides (EPG), personal resume queues, smart-TV/casting remotes, and cinema showtime and auditorium seat selection. The pack handles multi-title video catalogs, television guides and movie-theater booking, rather than single local media playback or audio/ebook libraries.

## Apps it serves

Subscription streaming app, ad-supported live TV and FAST channels guide, anime/series tracker, smart-TV remote and casting controller, cinema showtime and auditorium seat booking app.

## What the core already covers

- Playing one video stream or trailer: `Player[video]` (and `Player[live]`).
- Curated poster shelves and backdrops: `List[shelf]`, `Gallery[wide]`; search and genre filters: `Search`, `Chips`, `FilterBar`.
- Audience reviews and ratings: `Review`; cinema street map: `MapPins`; cast and crew profiles: `Profile`, `People`; showtime date strip: `Calendar[week]`.
- Scannable cinema e-ticket pass once booked: `PassCard` (or `ticketing` if combined at app level, never a dependency).

Separate `MovieDetail`, `Watchlist` and `TrailerPlayer` components are dropped: trailers use `Player[video]`, and simple editorial shelves use `List[shelf]`. `TitleHero` earns its place with release year, maturity, runtime/season pills, audience score, trailer launch, watchlist toggle and Play/Resume CTA; `SeasonEpisodes` manages season selectors paired with episode synopses, watched bars and download toggles; `ChannelGuide` draws a sticky multi-channel live TV grid across time slots; `WatchQueue` tracks `S2·E4` resume markers and remaining time; `RemoteControl` provides a virtual TV D-pad and media transport pad (`KitRemotePad`); `Showtimes` filters theater schedules by projection format (`IMAX`, `Dolby`, `3D`); and `SeatPicker` renders an auditorium seat map facing a screen (`KitSeatGrid`).

## Components (7)

### `TitleHero` · planned · content · phone
Movie or TV series showcase header featuring wide backdrop art, title, release year, maturity pill, runtime or season count, optional audience score, synopsis, My List toggle, Trailer button and a primary Play or Resume CTA.
- Pick: opening a movie or TV series detail page. Not generic headline statements (`Hero`), audio/book collections (media `Collection`), or serialized comic banners (comics `SeriesHeader`).
- Writes: `titleId` text(32), `title` text(40), `backdrop` photo, `year` integer 1900–2100, `maturity` text(12), `durationOrSeasons` text(20), `scorePercent` integer 0–100 optional, `synopsis` text(240), `inList` boolean (default false), `resumeLabel` text(24) optional, `playGoto` optional, `trailerGoto` optional, `style`.
- Styles: `feature` (default, full backdrop hero with actions), `compact` (tighter header strip).
- Parts → actions: `play press` (to `playGoto`), `trailer press` (to `trailerGoto`), `watchlist toggle`.
- States: filled, loading.
- Real path: title metadata cached on the device or fetched from a streaming/cinema catalog; watchlist changes persist to the user's queue.

### `SeasonEpisodes` · planned · content · phone
Season picker paired with numbered episode rows showing frame thumbnail, episode number, title, runtime, plot synopsis, watched progress bar and offline download toggle. Tapping an episode launches playback from its saved position.
- Pick: browsing episodes across seasons of a TV, anime or streaming series. Not single-collection audio tracks (media `Playlist`), coin-gated comic chapters (comics `EpisodeGate`), or daily agendas (`Timeline`).
- Writes: `seriesId` text(32), `seasons` of `seasonNumber` integer 1–99, `label` text(20), 1–12; `selectedSeason` integer 1–99, `episodes` of `episodeId` text(32), `seasonNumber` integer 1–99, `episodeNumber` integer 1–999, `title` text(36), `thumb` photo, `minutes` integer 1–300, `synopsis` text(140), `progress` number 0–1 (default 0), `downloaded` boolean (default false), `goto`, 1–24; `style`. Season filtering and watched indicators are computed from `selectedSeason` and `progress`.
- Styles: `rows` (default, thumbnail, synopsis and progress bar), `compact` (numbered episode rows with runtime and download toggle).
- Parts → actions: seasons `root select`, episodes `root press`, episodes `download toggle`. `meta.partTiers: { download: "service" }`.
- States: filled, empty, loading.
- Real path: reads season/episode listings from the streaming catalog; offline downloads cache encrypted video files on the phone.
- Density: `meta.dense: true`, weight 3; multi-season series hold up to 12 seasons and 24 episodes per view.

### `ChannelGuide` · planned · data · service
Electronic Program Guide (EPG) with a sticky left channel column (channel number, name and logo) across horizontally scrolling time slots, highlighting currently airing live programs with elapsed progress bars. Tapping a live broadcast opens its stream or program details.
- Pick: browsing multi-channel live TV schedules across time slots. Not personal schedules (`Timeline`), school periods (learning `Timetable`), or generic tables (data `Table`).
- Writes: `slots` of `slotId` text(16), `label` text(12) (`HH:MM`), 4–12; `channels` of `channelId` text(24), `number` text(8), `name` text(20), `logo` photo optional, `programs` of `programId` text(32), `title` text(36), `startSlot` integer 0–11, `spanSlots` integer 1–6, `live` boolean (default false), `progress` number 0–1 optional, `goto` optional, 1–8, 1–16; `style`. Slot span geometry and live highlights compute from `startSlot`, `spanSlots` and `live`.
- Styles: `grid` (default, sticky channels across time slots), `nowNext` (two-column "Now & Next" live channel summary).
- Parts → actions: programs `root press`, `now press` (scrolls to current time slot).
- States: filled, empty, loading, error (EPG feed unavailable).
- Real path: live broadcast schedule and channel metadata fetched from a live-TV or FAST guide service via `KitTable`.
- Density: `meta.dense: true`, weight 3; sticky EPG matrix across up to 16 channels and 12 time slots.

### `WatchQueue` · planned · content · phone
Personal "Continue Watching" rail or "My List" queue displaying artwork, title, `S2·E4` episode marker, elapsed progress bar, computed time remaining and quick info or remove controls.
- Pick: resuming in-progress shows and movies or managing a personal watchlist. Not full season lists (`SeasonEpisodes`), investment watchlists (invest `Watchlist`), or book libraries (media `Library`).
- Writes: `items` of `titleId` text(32), `title` text(36), `thumb` photo, `episodeTag` text(12) optional (`"S2·E4"`), `totalMinutes` integer 1–600, `progress` number 0–1, `inMyList` boolean (default true), `goto`, `infoGoto` optional, 1–6; `style`. Time remaining is computed from `totalMinutes` and `progress`; never model-written.
- Styles: `rail` (default, horizontal resume cards), `list` (vertical queue rows with info and remove actions).
- Parts → actions: items `root press`, items `info press` (to `infoGoto`), items `remove press`. `meta.confirmParts: ["remove"]`.
- States: filled, empty, loading.
- Real path: playback positions and saved titles stored locally on the phone or synced across screens for one viewer profile.

### `RemoteControl` · planned · action · ok
Virtual smart-TV and casting remote displaying an active device selector, directional D-pad (Up, Down, Left, Right, OK), Back and Home keys, voice-search mic trigger, volume up/down and mute buttons, and play/pause transport keys.
- Pick: controlling a paired smart TV, streaming stick or casting device from the phone. Not navigation shortcuts (`Actions`), smart-home switches (home `Devices`), or local video playback (`Player`).
- Writes: `devices` of `deviceId` text(24), `name` text(28), `online` boolean, 1–6; `activeDeviceId` text(24) optional, `muted` boolean (default false), `playing` boolean (default false), `style`.
- Styles: `dpad` (default, full directional pad and media cluster), `compact` (playback transport and volume strip).
- Parts → actions: `device select`, `up press`, `down press`, `left press`, `right press`, `ok press`, `back press`, `home press`, `voice press`, `volumeUp increment`, `volumeDown decrement`, `mute toggle`, `play play`, `play pause`. `meta.partTiers: { voice: "ok" }`.
- States: filled, empty (no paired TVs found), loading (connecting), error (device unreachable).
- Real path: discovers smart TVs over local Wi-Fi or Bluetooth (`ok` local network and optional mic permissions) and dispatches remote key commands via `KitRemotePad`.

### `Showtimes` · planned · input · service
Cinema location cards for a film with projection format filter pills (`All`, `IMAX`, `Dolby`, `3D`, `Standard`), distance label and a grid of tappable showtime chips showing format badges and sold-out states. Selecting a showtime opens auditorium seat selection.
- Pick: picking a cinema screening time and projection format. Not appointment slots (booking `Slots`), local venue cards (places `PlaceCard`), or concert listings (ticketing `SeatListings`).
- Writes: `movieTitle` text(40), `date`, `selectedFormat` text(12) optional, `theaters` of `theaterId` text(24), `name` text(32), `distanceLabel` text(12) optional, `times` of `showtimeId` text(32), `time` HH:MM, `format` (`standard`, `imax`, `dolby`, `3d`), `taken` boolean (default false), `goto` optional, 1–12, 1–6; `selectedShowtimeId` text(32) optional, `style`. Format filtering and disabled `taken` states are computed.
- Styles: `list` (default, theater cards with wrapping time chips), `compact` (single-theater time grid).
- Parts → actions: formats `root select`, times `root select`.
- States: filled, empty (no screenings on chosen date), loading.
- Real path: theater schedules and real-time screening availability queried from a cinema ticketing service via `KitSlotGrid`.

### `SeatPicker` · planned · input · service
Cinema auditorium seat grid positioned under a curved Screen header bar, rendering lettered rows, numbered seats, aisle gaps, seat kinds (standard, premium recliner, accessible, occupied and selected), and a computed bottom summary of chosen seats and subtotal.
- Pick: choosing numbered seats inside a cinema auditorium facing a screen. Not round banquet tables (events `Seating`), airline cabin seating (trips `CabinSeats`), or broad venue price tiers (ticketing `PriceTiers`).
- Writes: `showtimeId` text(32), `screenLabel` text(24) (default "Screen"), `rows` of `rowLabel` text(4), `seats` of `seatId` text(16), `col` integer 1–16, `kind` (`standard`, `premium`, `accessible`, `aisle`), `status` (`available`, `occupied`), `price` number ≥ 0, 2–16, 2–12; `maxSelect` integer 1–8 (default 6), `selectedSeatIds` text(16) each 0–8, `style`. Chosen seat codes, count and total price are computed; occupied and aisle slots disable selection.
- Styles: `map` (default, full auditorium seat grid under screen bar), `summary` (chosen seats and subtotal strip).
- Parts → actions: seats `root toggle`, `clear press`.
- States: filled, empty, loading, error (seat hold expired or already claimed).
- Real path: fetches live auditorium geometry and seat holds from a cinema service during booking.
- Renderer: adapt auditorium rows, badges, screen marker and subtotal to `SeatPlan` / `KitSeatGrid`. Watch owns multi-toggle limits and seat holds; it does not reuse CabinSeats' single-select/confirm policy.
- Density: `meta.dense: true`, weight 3; auditorium seat grid renders up to 12 rows by 16 columns with aisles.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `stream_home` | Explore shelves, resume queue and live TV | `watch_discover`, `watch_live` | `watch_discover`: Header, Search, Chips, WatchQueue[rail], SectionTitle, List[shelf] · `watch_live`: Header, Chips, ChannelGuide, Note |
| `show_detail` | Inspect one series or movie and episodes | `watch_series`, `watch_movie` | `watch_series`: Header[back], TitleHero, SeasonEpisodes, Note · `watch_movie`: Header[back], TitleHero, KeyValue, Review, Button |
| `cinema_book` | Pick showtimes and auditorium seats | `watch_times`, `watch_seats` | `watch_times`: Header[back], Calendar[week], Showtimes, Note · `watch_seats`: Header[back], SeatPicker, Note, Button |
| `tv_remote` | Control paired smart TVs and queues | `watch_pad` | `watch_pad`: Header, RemoteControl, WatchQueue[list], Note |

The first listed layout is each `defaultLayout`; all layout ids are `watch_`-prefixed and unique. Recipes use only core (including Wave 6 core `Review`) plus `watch`, keep every screen at 4–6 components, total weight at most 8, and at most one heavy component per screen.

## Worked example: ReelGuide

A combined streaming guide, TV remote and cinema booking app, separate from Ledge and Trot. `stream_home/watch_discover` opens with `"Continue Watching"` (`WatchQueue[rail]`) showing **Harbor City** at `S2·E4` with 18 minutes left (computed from 50 minutes at 0.64 progress). Tapping the card opens `show_detail/watch_series`, displaying `TitleHero` (`2025`, `TV-14`, `2 Seasons`) and `SeasonEpisodes` for Season 2. Switching to `stream_home/watch_live` shows a 12-channel EPG grid with live progress bars across `19:00`–`21:00`.

For a Friday theater outing, `cinema_book/watch_times` picks Friday on core `Calendar[week]` (`calendar_sweep`, the app's single signature) and filters `Showtimes` to `IMAX` at `19:45`. `cinema_book/watch_seats` displays rows A–H facing the Screen bar; selecting `E7` and `E8` at 18 each computes a 36 total before checkout. At home, `tv_remote/watch_pad` pairs with `"Living Room TV"` to navigate menus and pause playback.

## Tiers

`TitleHero`, `SeasonEpisodes` (local metadata) and `WatchQueue` work on the phone. `ChannelGuide`, `Showtimes`, `SeatPicker` and offline video downloads (`SeasonEpisodes.download`) require outside services (`service`); `RemoteControl` needs local network permission and optional mic permission (`ok`).

## Build notes

- Order: `TitleHero`, `WatchQueue`, `SeasonEpisodes`, `ChannelGuide`, `Showtimes`, `SeatPicker`, `RemoteControl`; all remain planned.
- New kit bases: `RemoteControl` requires `KitRemotePad`; `SeatPicker` shares the grid branch of `SeatPlan` with `trips/CabinSeats`. `ChannelGuide` reuses `KitTable` and `Showtimes` reuses `KitSlotGrid`.
- `SeasonEpisodes`, `ChannelGuide` and `SeatPicker` are `dense` (`weight 3`); the remaining four components are weight 2.
- Writers use strict `writerFormat(registry)` for core plus `watch`; no aliases or off-pack fallbacks. Never write remaining minutes, ticket subtotals or EPG spans as pre-formatted strings.
- Each component later ships two domain examples, choose/write/read probes and declared part/state tests, plus a three-preset `example.jsonl`.

## Open questions

- **Vertical micro-drama 9:16 HLS loops?** Default: full-motion video playback mounts through host `Player` / `Canvas` adapters; chapter gating reuses `comics/EpisodeGate` only if both packs load, never as a cross-pack dependency.
- **Cinema concession add-ons and payment?** Default: combine `watch` with `commerce` at app level rather than adding a cinema snack cart here.
- **New action names?** None. Playback uses `play`/`pause`, volume uses `increment`/`decrement`, mute/seats/downloads use `toggle`, D-pad and navigation use `press`, seasons/formats/devices use `select`.

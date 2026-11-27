# `media` pack

**Status:** renamed from `content` · **Wave:** 4 · **Pick line:** Reading, listening and watching a library.
Not one recording on one screen (core `Player`).

## Purpose

A library of things to read, hear or watch: articles, books, podcasts, albums, sermons, video courses. The
core `Player` plays one recording; this pack adds what a library needs around it: the reading view, a show's
page, episode lists, chapters, a player that follows the person between screens, and saved highlights.

## Apps it serves

Podcast app, audiobook or reading tracker, a church's sermons, a band's releases, a newsletter or blog
reader, a museum audio guide, a meditation library (with `mind`), a cooking video channel (with `kitchen`).

## What the core already covers

- Playing one recording: `Player` (`audio`, `video`, `compact`).
- "Continue listening": `List` style `shelf`; a featured item: `Hero` style `photo`.
- Searching and filtering the library: `Search`, `Chips`; minutes listened: `Stats`; one book's progress:
  `Ring`.
- Instructions, an about page or a policy that is short: `List` style `expand` or `Note`.

The first plan's `RichText` is folded into `Article` style `plain`, and `Episode` is a `Playlist` row plus
the core `Player`.

## Components (9)

### `Article` · planned · content · phone
Long-form reading: title, byline and date, reading time, an optional lead image, then the body in
paragraphs with headings, quotes and lists, set for comfortable reading.
- Pick: reading something long. Not one sentence (`Note`), not a few expandable answers (`List` style
  `expand`), not a community post (social `Post`), not terms to sign (customers `Agreement`).
- Writes: `title` text(80), `by` text(32) optional, `date` optional, `photo` optional, `body` text(2000)
  in a small markdown subset (headings, paragraphs, lists, quotes, bold, italic, and links to screen ids as
  `[text](screen:id)`), `style`. Reading time is computed.
- Styles: `article` (default, with header), `plain` (body only: about pages, instructions, policies).
- Parts → actions: links `root press` (to their screen). · States: filled, loading.
- Real path: text stored on or bundled with the app.
- Wave 6 note: proposed for promotion to Core with `style: "article" | "book" | "response"`, `paper` (`light`, `sepia`, `dark`), `fontScale`, `progress`, and `bookmark` toggle so e-books, news, and AI responses share one reader. `Article` remains listed here among `media.md`'s 9 components until Core promotion ships.

### `Library` · planned · content · phone
The person's library as a grid of covers (books, shows, albums), a progress bar under each started one and a
badge for new episodes.
- Pick: everything the person has saved to read or play. Not photos (`Gallery`), not a shelf of suggestions
  (`List` style `shelf`), not things owned (inventory `Things`).
- Writes: `items` of `title` text(32), `by` text(24) optional, `photo`, `progress` 0–1 optional, `badge`
  text(8) optional, `goto`, 1–12.
- Parts → actions: items `root press`. · States: filled, empty, loading. · Dense.
- Real path: saved items on the device.

### `Collection` · planned · content · phone
The head of a show, album, book or course: large artwork, title, author, a line about it, recording count
and duration, optional ratings and shelf details, and play and follow buttons.
- Pick: the top of one show, album, book or course page. Not a person (`Profile`), not a headline (`Hero`),
  not one recording (`Player`), not a collection of owned things (inventory `Things`).
- Writes: `style` (`show` | `album` | `book`) optional, `title` text(40), `by` text(32), `photo` photo-or-image[media_cover|poster],
  `about` text(200) optional, `followed` boolean, `rating` number 0–5 optional, `ratingCount` int ≥0
  optional, `tags` text(20) each 0–3 optional, `shelfStatus` text(24) optional. Count and total length
  are computed from the screen's `Playlist` or the host playlist data. Rating and rating count may be
  provided independently; the count does not imply a rating.
- Layouts: `show` (also used when style is omitted) places artwork above the left-aligned title and credits.
  `album` centers the title and credits below the artwork. `book` places the title and credits above
  the artwork and labels the play action “Play audiobook”.
- Parts → actions: `rating`, `rating_count`, `tags`, `shelf_status`, `play press`, `follow toggle`. ·
  States: filled, loading.
- Real path: collection details stored with the app's media.

### `Playlist` · planned · content · phone
Tracks or episodes in order: number or artwork, title, date, length, a played bar, and a download or done
mark; the playing one shows a level icon.
- Pick: recordings to choose from in order. Not things in general (`List`), not chapters inside one
  recording (`ChapterList`).
- Writes: `items` of `title` text(32), `sub` text(36) optional, `seconds`, `played` 0–1, `photo`
  optional, `goto` (the player screen), 1–6; `playing` index optional; `style`.
- Styles: `tracks` (default, numbered), `episodes` (with date and a description line).
- Parts → actions: items `root press` (goes to `goto`), items `trail press` (download).
- States: filled, empty, loading. · Real path: media files on the device.

### `ChapterList` · planned · content · phone
Chapters of the recording or book on the same screen, with start times and titles; the current one marked;
pressing one seeks the screen's `Player` there.
- Pick: jumping to a part of the recording playing on this screen. Not separate recordings (`Playlist`),
  not steps of a recipe (kitchen `CookSteps`).
- Writes: `chapters` of `title` text(32), `at` seconds, 2–16; `current` index optional.
- Parts → actions: items `root press`. · States: filled. · Dense.
- Rule: only on a screen with a `Player`; the kit forwards the press as `seek` to it (a wiring the catalog
  declares in `meta.drives: "Player"`).
- Real path: chapter marks stored with the file.

### `MiniPlayer` · planned · action · phone · code-owned
A slim bar above the tab bar while something plays: artwork, title, a thin progress line and play or pause,
opening the full player on tap. Like `TabBar`, the host adds it to every screen while something plays; a
model never writes it.
- Pick: never chosen by a model. It is the persistent bar, not `Player` style `compact`, which is a row on
  one screen.
- Writes (code): `title`, `photo`, `at`, `seconds`, `playing`, `goto`.
- Parts → actions: `root press`, `play play`, `play pause`. · Region: bottom, between the primary `Button`
  and the `TabBar`; hidden on a screen that has a `Player`.
- Real path: the device's current playback.

### `Highlights` · planned · content · phone
Saved passages and moments: the quoted text or a clip time, where it is from, the date and an optional note,
each opening the source at that spot.
- Pick: passages or moments the person saved. Not a journal of their own words (mind `Entries`), not whole
  items saved (`Library`).
- Writes: `items` of `text` text(240), `from` text(36), `at` text(12) optional, `note` text(120)
  optional, `goto`, 1–6.
- Parts → actions: items `root press`. · States: filled, empty.
- Real path: highlights stored on the device.

### `Transcript` · planned · content · phone
Line-by-line time-synced song lyrics or spoken podcast transcript that auto-highlights the active timestamp during playback and keeps the current line scrolled into view. Tapping any line seeks the screen's `Player` (`meta.drives: "Player"`), and a save action clips lines directly to `Highlights`.
- Pick: continuous time-synced lyrics or spoken podcast and audiobook transcripts. Not coarse chapter jumps (`ChapterList`), static long-form reading (`Article`), or saved quotes alone (`Highlights`).
- Writes: `lines` of `at` seconds ≥ 0, `speaker` text(20) optional, `text` text(160), 2–40; `current` index optional, `follow` boolean (default true), `style`. Active line highlighting and formatted timestamps follow playback position and `at` seconds.
- Styles: `lyrics` (default, centered lyric lines with emphasized active line), `spoken` (left-aligned speaker labels with timestamp rail).
- Parts → actions: lines `root press` (seeks `Player` to `at`), lines `save press` (clips line to `Highlights`), `follow toggle` (auto-scroll sync). `meta.drives: "Player"`.
- States: filled, empty (no transcript available), loading.
- Real path: timed caption or LRC files bundled with local media or fetched from a media host; requires `Player` on the same screen for seeking.
- Density: `meta.dense: true`, weight 3; time-synced transcripts hold up to forty timestamped lines.

### `AudioMatch` · planned · action · ok
A tap-to-listen ambient music recognition card that triggers microphone matching against nearby audio, reveals the identified track with cover artwork, artist, and external-play links, and lists recent matches below. If matching fails, it preserves recent match history and offers a retry.
- Pick: identifying music or humming playing nearby via the microphone. Not playing stored audio (`Player`), typing catalog search queries (`Search`), or speaking pronunciation drills (learning `SpeechCheck`).
- Writes: `listening` boolean (default false), `match` (`title` text(40), `artist` text(32), `album` text(32) optional, `photo` optional, `url` text(120) optional) optional, `history` of `title` text(32), `artist` text(24), `photo` optional, `matchedAt` text(12), `goto` optional, 0–6; `style`. Listening state and identified match payloads come from the host recognition adapter, never invented by the model.
- Styles: `listen` (default, centered listening pulse tile above recent match history), `result` (focused identified track card with artwork and external play links).
- Parts → actions: `listen start`, `listen stop` (captures mic sample and queries recognition service), `open press` (opens matched track externally), history `root press`. `meta.partTiers: { listen: "service", open: "service" }`.
- States: empty (ready to listen, no history yet), filled, loading (listening and matching), success (track identified), error (no match found or mic permission denied).
- Real path: microphone permission (`ok`) captures audio matched by an external acoustic-recognition service (`listen`, `open`); DSP fingerprinting stays in the host adapter.

## Archetypes (3)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `library` | My things to read or hear | `covers`, `home` | `covers`: Header, Segmented, Library · `home`: Header, Stats, SectionTitle, List[shelf], SectionTitle, List[shelf] |
| `collection` | One show, album or book | `episodes` | Header[back], Collection, Playlist |
| `reader` | Reading, playing, saved | `article`, `listen`, `highlights` | `article`: Header[back], Article, SectionTitle, List[shelf] · `listen`: Header[back], Player, ChapterList · `highlights`: Header, Search, Highlights |

## Worked example: Pew

A small church's sermons. `library/home` shows minutes listened this month and "Latest" and "Series" shelves;
a series opens as a `Collection` with its `Playlist`; a sermon plays on `reader/listen` with `ChapterList`
for the readings; the code-owned `MiniPlayer` follows across tabs; saved lines are `reader/highlights`.
Signature: `count_up` on minutes listened.

## Tiers

All `phone` for files on the device. Streaming from a service would make `Library`, `Collection` and
`Playlist` `service`; the default keeps files local.

## Build notes

- Order: `Playlist`, `Collection`, `Article`, `Library`, `ChapterList`, `MiniPlayer`, `Highlights`; Wave 6 additions follow in order: `Transcript`, `AudioMatch`.
- `Article` markdown is parsed by a small catalog parser into kit text roles; no HTML.
- `MiniPlayer` adds a rule to plan 4.5's regions: bottom holds the primary action, then the mini player,
  then the tab bar.
- Wave 6 Core promotions & option upgrades: `Article` is proposed for promotion to Core (`style: "article" | "book" | "response"`, `paper`, `fontScale`, `progress`, `bookmark`) while remaining in `media.md` for now; **Media Reviews** are served by proposing Core promotion of `customers/Review` with optional `spoiler` toggle and `helpful` vote (if `Review` stays in `customers`, add `MediaReview` here later). On existing components: `Library` adds `style: "grid" | "list" | "shelf" | "loans"` plus `status` (`owned`, `borrowed`, `hold`, `finished`) and `dueLabel`; `Collection` adds `style: "show" | "album" | "book"` plus `rating`, `ratingCount`, `tags` (0–3), and `shelfStatus`; `Playlist` adds `style: "tracks" | "episodes" | "queue"`; `Highlights` adds `kind: "quote" | "clip" | "bookmark"`.
- Wave 6 boundaries: TV series seasons, live EPGs, TV remotes, and cinema seats move to `watch`; vertical webtoons/manga and paid chapter unlocks move to `comics`; news rivers and bias clusters move to `news`; scripture and dictionaries move to `reference`; multitrack DAWs and real-time EQ stay in `Canvas`.

## Open questions

- **The first plan's name `content`?** Renamed because "content" reads as anything on a screen; `content`
  → `media` is a planned migration for one minor version, pending implementation.
- **Downloads screen?** Default: `Playlist` filtered by `Chips` ("Downloaded"); no component.

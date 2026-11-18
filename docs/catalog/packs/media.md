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

## Components (7)

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
The head of a show, album, book or course: large artwork, title, author, a line about it, a count ("12
episodes · 5 h"), and play-all and follow buttons.
- Pick: the top of one show, album, book or course page. Not a person (`Profile`), not a headline (`Hero`),
  not one recording (`Player`), not a collection of owned things (inventory `Things`).
- Writes: `title` text(40), `by` text(32), `photo`, `about` text(200) optional, `followed` boolean. The
  count and total length are computed from the `Playlist` on the screen.
- Parts → actions: `play press`, `follow toggle`. · States: filled, loading.
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

- Order: `Playlist`, `Collection`, `Article`, `Library`, `ChapterList`, `MiniPlayer`, `Highlights`.
- `Article` markdown is parsed by a small catalog parser into kit text roles; no HTML.
- `MiniPlayer` adds a rule to plan 4.5's regions: bottom holds the primary action, then the mini player,
  then the tab bar.

## Open questions

- **The first plan's name `content`?** Renamed because "content" reads as anything on a screen; `content`
  stays a pack alias for one minor version.
- **Downloads screen?** Default: `Playlist` filtered by `Chips` ("Downloaded"); no component.

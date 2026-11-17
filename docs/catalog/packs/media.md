# `media` pack

**Status:** renamed from `content` · **Wave:** 4 · **Pick line:** Reading, listening and watching a library.
Not one recording on one screen (core `Player`).

## Purpose

A library of things to read, hear or watch: articles, books, podcasts, albums, courses on video, sermons,
recipes on video. The core `Player` plays one recording; this pack adds what a library needs around it: the
reading view, shows and albums, episode lists, chapters, a player that follows the person between screens,
and saved highlights.

## Apps it serves

Podcast app, audiobook or reading tracker, a church's sermons, a band's releases, a newsletter or blog
reader, a museum audio guide, a meditation library (with `mind`), a cooking video channel (with `kitchen`).

## What the core already covers

- Playing one recording: `Player` (`audio`, `video`, `compact`).
- A shelf of "Continue listening": `List` style `shelf`; a hero: `Hero` style `photo`.
- Searching and filtering the library: `Search`, `Chips`; progress through one book: `Ring`.

The first plan's `RichText` is folded into `Article` style `plain`, and `Episode` is the `Playlist` row plus
the core `Player`.

## Components (7)

### `Article` · planned · content · phone
Long-form reading: a title, byline and date, reading time, an optional lead image, then the body in
paragraphs with headings, quotes and lists, set for comfortable reading.
- Pick: reading something long. Not one sentence (`Note`), not a post by a person in a community (social
  `Post`), not terms to sign (customers `Agreement`).
- Writes: `title` text(80), `by` text(32) optional, `date` optional, `photo` optional, `body` text(6000) in a
  small markdown subset (headings, paragraphs, lists, quotes, bold, italic, links), `style`.
- Styles: `article` (default, with header), `plain` (body only: about pages, instructions, policies).
- Parts → actions: links `root press`. · States: filled, loading.
- Real path: text stored on or bundled with the app. · Aliases: article, story, blogpost, richtext, reader.

### `Library` · planned · content · phone
The person's library as a grid of covers (books, shows, albums) with a progress bar under each started one
and a badge for new episodes.
- Pick: everything the person has saved to read or play. Not photos (`Gallery`), not a shelf of suggestions
  (`List` style `shelf`).
- Writes: `items` of `title` text(32), `by` text(24) optional, `photo`, `progress` 0–1 optional, `badge`
  text(8) optional, `goto`, 1–12; `style`.
- Styles: `covers` (default, grid), `rows`. · Parts → actions: items `root press`.
- States: filled, empty, loading. · Real path: saved items on the device. · Aliases: library, bookshelf, saved, collection.

### `Collection` · planned · content · phone
The head of a show, album, book or course: large artwork, title, author, a line about it, counts (12
episodes · 5 h), and play-all and follow buttons.
- Pick: the top of one show, album, book or course page. Not a person (`Profile`), not one recording
  (`Player`).
- Writes: `title` text(40), `by` text(32), `photo`, `about` text(200) optional, `count` text(24) optional,
  `followed` boolean.
- Parts → actions: `play press`, `follow toggle`. · States: filled, loading.
- Real path: collection details stored with the app's media. · Aliases: show, album, podcast, series, course header.

### `Playlist` · planned · content · phone
Tracks or episodes in order: number or artwork, title, date, length, a played bar, and a download or done
mark; the playing one shows a level icon.
- Pick: recordings to choose from in order. Not things in general (`List`), not chapters inside one
  recording (`ChapterList`).
- Writes: `items` of `title` text(40), `sub` text(32) optional, `seconds`, `played` 0–1, `photo` optional,
  `goto`, 1–10; `playing` index optional; `style`.
- Styles: `tracks` (default, numbered), `episodes` (with date and description line).
- Parts → actions: items `root press` (plays), items `trail press` (download). · States: filled, empty, loading.
- Real path: media files on the device. · Aliases: playlist, tracks, episodes, queue, tracklist.

### `ChapterList` · planned · content · phone
Chapters of one recording or book with start times and titles; the current one marked; tapping jumps there.
- Pick: jumping to a part of one recording or book. Not separate recordings (`Playlist`), not steps of a
  recipe (kitchen `CookSteps`).
- Writes: `chapters` of `title` text(40), `at` seconds, 2–16; `current` index optional.
- Parts → actions: items `root press` (seeks the screen's `Player`). · States: filled.
- Real path: chapter marks stored with the file. · Aliases: chapters, sections, contents, table of contents.

### `MiniPlayer` · planned · action · phone
A slim bar above the tab bar while something plays: artwork, title, a thin progress line, and play or pause,
opening the full player on tap.
- Pick: keeping what is playing in reach on other screens. Not the full player (`Player`), not a basket bar
  (commerce `CartBar`).
- Writes: `title` text(32), `photo`, `at` seconds, `seconds`, `playing` boolean, `goto`.
- Parts → actions: `root press`, `play play`, `play pause`. · States: filled, empty (hidden). · Region: bottom.
- Real path: the device's current playback. · Aliases: miniplayer, nowplayingbar, playbar.

### `Highlights` · planned · content · phone
Saved passages and moments: the quoted text or a clip time, where it is from, the date, and an optional
note, each opening the source at that spot.
- Pick: passages or moments the person saved. Not a journal of their own words (mind `Entry`), not
  bookmarks of whole items (`Library`).
- Writes: `items` of `text` text(240), `from` text(40), `at` text(12) optional, `note` text(120)
  optional, `goto`, 1–6.
- Parts → actions: items `root press`. · States: filled, empty.
- Real path: highlights stored on the device. · Aliases: highlights, quotes, bookmarks, clips, notes.

## Archetypes (3)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `library` | My things to read or hear | `covers`, `home` | `covers`: Header, Segmented, Library · `home`: Header, SectionTitle, List[shelf], SectionTitle, List[shelf], MiniPlayer |
| `collection` | One show, album or book | `episodes`, `chapters` | Header[back], Collection, Playlist \| ChapterList |
| `reader` | Reading or playing one thing | `article`, `listen` | `article`: Header[back], Article · `listen`: Header[back], Player, ChapterList |

## Worked example: Pew

A small church's sermons. `library/home` shows "Latest" and "Series" shelves; a series opens as a
`Collection` with its `Playlist` of sermons; a sermon plays in the core `Player` with `ChapterList` for the
readings; the `MiniPlayer` follows across tabs; notes from a sermon are `Highlights`. Signature:
`count_up` on minutes listened this month.

## Aliases that shadow the core

With `media`: `article`, `reader` → `Article` (otherwise `Note`); `playlist`, `episodes` → `Playlist`
(otherwise `List`); `library` → `Library` (otherwise `Gallery`); `chapters` → `ChapterList`.

## Tiers

All `phone` for files on the device. Streaming from a service would change `Player`, `Playlist` and
`Library` to tier `service`; the default keeps files local.

## Build notes

- Order: `Playlist`, `Collection`, `MiniPlayer`, `Article`, `Library`, `ChapterList`, `Highlights`.
- `Article` markdown is parsed by a small catalog parser into kit text roles; no HTML.

## Open questions

- **The first plan's pack name `content`?** Renamed to `media` because "content" reads as anything on a
  screen; the old name stays as a pack alias for one minor version.

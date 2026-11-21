# `reference` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Scripture study, dictionaries and encyclopedias: verse
text, book/chapter/verse pickers, study plans, lexicon entries, parallel translations and cited reference
pages. Not ebooks/audio (`media`), not quizzes (`learning`), not business bookkeeping (`books`).

## Purpose

Canonical study, word lookup, and structured reference reading: verse-numbered scripture chapters with
verse highlighting and footnotes, three-step `Book → Chapter → Verse` canonical navigation, multi-day
devotional reading plans, dictionary/lexicon entries with IPA phonetics and numbered senses, side-by-side
parallel translation comparisons, and encyclopedia reference pages with summary infoboxes, Table of
Contents jump links, and citation footnotes. General books and audiobooks live in `media`; flashcards and
graded quizzes live in `learning`; small-business accounting lives in `books`.

## Apps it serves

Scripture study and audio Bible companion, offline dictionary and thesaurus, encyclopedia and structured
knowledge reference reader, daily devotional plan tracker.

## What the core already covers

- General prose essays and chapters without verse indexing or infoboxes: wave 6 core `Article`.
- Audio read-along playback: core `Player[compact]`; search and topic filtering: `Search`, `Chips`.
- Ebook shelves, audio chapter lists, and saved quote highlights: `media` (`Library`, `ChapterList`,
  `Highlights`).
- Spaced-repetition flashcards and graded quizzes: `learning` (`Flashcard`, `Quiz`).
- Simple term-value pairs: `KeyValue`; personal study reflections: core `Composer[entry]`.

`ScriptureText` stays for verse-indexed canonical chapters with red-letter styling, verse actions, and
audio read-along sync; `VersePicker` for `Book → Chapter → Verse` canonical jumping across translations;
`StudyPlan` for multi-day reading schedules with daily passage ticks; `LexiconEntry` for dictionary
headwords, IPA audio, part-of-speech tabs, numbered senses, and etymology; `ParallelCompare` for aligned
two-translation or commentary views; and `ReferenceEntry` for infoboxes, jump outlines, and citation
footnotes.

## Components (6)

### `ScriptureText` · planned · content · phone
Verse-numbered chapter text inside a reader scroll surface (`KitScroll`) with superscript verse numbers,
optional red-letter or emphasis styling, inline footnote markers, active audio-sync highlight, paper theme
selection (`light`, `sepia`, `dark`), and a verse selection bar for highlighting, bookmarking, or copying.
- Pick: reading verse-indexed scripture or canonical study texts with verse numbers and verse-level
  actions. Not prose essays (core `Article`), not side-by-side translation comparisons (`ParallelCompare`),
  not short notes (`Note`).
- Writes: `book` text(24), `chapter` number ≥ 1, `translation` text(12), `verses` of `num` number ≥ 1,
  `text` text(400), `emphasis` boolean optional, `highlighted` boolean (default false), `bookmarked`
  boolean (default false), `footnote` text(120) optional, 1–40; `activeVerse` number optional, `paper`
  (`light`, `sepia`, `dark`), `style`. Selected verse count and formatted citation copy text are computed
  by code.
- Styles: `verses` (default, verse numbers inline in continuous paragraph flow), `lines` (each verse on a
  separate numbered row for line-by-line study).
- Parts → actions: verses `root select`, `highlight toggle`, `bookmark toggle`, `copy copy`, `prev press`,
  `next press`.
- States: filled, empty, loading.
- Real path: canonical book, chapter, and verse texts stored locally on the device (`phone`), with optional
  audio read-along synced from core `Player`.
- Density: `meta.dense: true`, weight 3; canonical chapters hold up to 40 verse-numbered entries.

### `VersePicker` · planned · input · phone
Three-step canonical passage navigator (`Book → Chapter → Verse` grid) paired with a translation switcher
(`KJV`, `NIV`, `ESV`, `WEB`) and quick filter so readers can jump directly to any verse across a large
multi-book corpus.
- Pick: jumping by book, chapter, and verse across canonical texts. Not keyword full-text search
  (`Search`), not audio track chapter marks (media `ChapterList`), not date grids (`Calendar`).
- Writes: `translations` text(12) each 1–6; `translation` text(12), `books` of `name` text(24), `abbr`
  text(8), `chapters` number 1–150, 1–66; `selectedBook` text(24), `selectedChapter` number ≥ 1,
  `verseCount` number 1–176, `selectedVerse` number optional, `goto` (reader screen), `style`. Code bounds
  chapter and verse grid sizes to the chosen book and chapter.
- Styles: `steps` (default, Book list → Chapter grid → Verse grid), `compact` (inline book and chapter
  selector strip).
- Parts → actions: `translation select`, books `root select`, chapters `root select`, verses `root select`,
  `jump press` (opens `goto`).
- States: filled, loading.
- Real path: canonical book indexes and translation manifests bundled locally on the device (`phone`).
- Density: `meta.dense: true`, weight 3; canonical indexes span up to 66 books, 150 chapters, and 176
  verses.

### `StudyPlan` · planned · data · phone
Multi-day devotional or structured reference reading plan showing the plan title, completion meter
(`KitMeter`), day selector tabs, daily reading passage rows with completion checkmarks and reader jump
links, plus an optional reflection trigger.
- Pick: following a multi-day devotional or canonical study schedule. Not generic checklists (`Checklist`),
  not gamified skill paths (learning `Path`), not trip itineraries (trips `Itinerary`).
- Writes: `title` text(40), `totalDays` number 1–365, `completedDays` number ≥ 0, `days` of `day` number
  ≥ 1, `label` text(16), `readings` of `ref` text(32), `done` boolean, `goto` (scripture reader), 1–5,
  1–7; `activeDay` number ≥ 1, `reflectionGoto` optional, `style`. Overall completion percentage and day
  completion states are computed by code.
- Styles: `daily` (default, day selector strip, passage ticks, and completion meter), `compact` (today's
  readings card with overall progress bar).
- Parts → actions: days `root select`, readings `done check`, readings `root press` (opens `goto`),
  `reflect press` (opens `reflectionGoto`).
- States: filled, empty, loading, success (day completed).
- Real path: reading plan schedules and user completion ticks saved locally on the device (`phone`).

### `LexiconEntry` · planned · content · phone
Dictionary or glossary entry displaying the headword large, IPA phonetic spelling with an audio
pronunciation play button, part-of-speech tabs (`noun`, `verb`, `adj`), numbered definitions with usage
examples, tappable synonym chips, and an etymology note.
- Pick: presenting word definitions, IPA pronunciation, numbered senses, synonyms, and etymology. Not flat
  fact lists (`KeyValue`), not study flashcards (learning `Flashcard`), not encyclopedia entries
  (`ReferenceEntry`).
- Writes: `word` text(32), `phonetic` text(32) optional, `audioAvailable` boolean (default false), `entries`
  of `pos` (`noun`, `verb`, `adj`, `adv`, `prep`, `other`), `senses` of `definition` text(160), `example`
  text(120) optional, `synonyms` text(24) each 0–4, 1–6, 1–4; `etymology` text(200) optional, `saved`
  boolean (default false), `style`. Code switches senses cleanly by active part-of-speech tab.
- Styles: `full` (default, headword, IPA audio, POS tabs, numbered senses, synonyms, and etymology),
  `compact` (headword, primary POS, and top two senses).
- Parts → actions: `pronounce play`, `pos select`, `save toggle`, `copy copy`, synonyms `root press`.
- States: filled, empty (headword not found), loading.
- Real path: dictionary index bundled locally on the phone (`phone`); pronunciation playback uses the
  device audio adapter.

### `ParallelCompare` · planned · content · phone
Side-by-side or interleaved comparison of the same verse or short passage across two translations,
original-language texts, or study commentaries, with translation header pills, aligned verse numbers, swap
button, and copy-both action.
- Pick: comparing two translations, languages, or commentaries on one passage. Not single-version chapter
  reading (`ScriptureText`), not key-value facts (`KeyValue`), not news coverage bias (news `StoryCluster`).
- Writes: `reference` text(32), `leftLabel` text(12), `rightLabel` text(12), `rows` of `verse` number ≥ 1,
  `leftText` text(240), `rightText` text(240), 1–6; `style`. Code keeps verse rows vertically aligned across
  both columns or paired stacks.
- Styles: `columns` (default, two side-by-side columns), `interleaved` (paired translation A and B per
  verse).
- Parts → actions: `swap press`, `left select`, `right select`, rows `copy copy`.
- States: filled, empty, loading.
- Real path: parallel translation texts stored locally on the device (`phone`).

### `ReferenceEntry` · planned · content · phone
Encyclopedia or reference article combining a summary lead and optional illustration, a structured infobox
of key facts, a collapsible Table-of-Contents jump outline (`KitScroll`), multi-section prose with tappable
inline citation markers (`[1]`), and a bottom References section.
- Pick: reading structured encyclopedia or reference pages with an infobox, Table of Contents, and cited
  footnotes. Not plain prose essays (core `Article`), not dictionary headwords (`LexiconEntry`), not
  interactive lessons (learning `Lesson`).
- Writes: `title` text(60), `summary` text(240), `photo` optional, `infobox` of `label` text(20), `value`
  text(48), 0–8; `sections` of `heading` text(40), `body` text(500), 1–8; `citations` of `index` number
  1–20, `source` text(80), 0–12; `style`. TOC headings and inline citation jumps are wired by code.
- Styles: `entry` (default, summary, infobox, TOC jump outline, sections, and citations), `infobox`
  (condensed summary and fact table).
- Parts → actions: `toc select`, citations `root press`, `bookmark toggle`, `copy copy`.
- States: filled, empty, loading, error (reference page unavailable).
- Real path: offline encyclopedia dumps cached locally on the phone (`phone`), or live article queries
  through a reference service (`service`).
- Density: `meta.dense: true`, weight 3; infobox facts, structured sections, TOC links, and citations form
  one dense reference document.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `scripture_read` | Read canonical chapters by verse, compare translations, and jump across books | `reference_verse`, `reference_parallel`, `reference_navigate` | `reference_verse`: Header[back], ScriptureText, Note · `reference_parallel`: Header[back], ParallelCompare, Note, Button · `reference_navigate`: Header, Search, VersePicker |
| `devotional_hub` | Follow daily reading plans and record devotional reflections | `reference_today`, `reference_plans` | `reference_today`: Header, StudyPlan[compact], Composer[entry], Button · `reference_plans`: Header, Search, StudyPlan, Note |
| `lookup_entry` | Look up dictionary headwords and cited encyclopedia entries | `reference_word`, `reference_encyclopedia` | `reference_word`: Header, Search, LexiconEntry, Note · `reference_encyclopedia`: Header[back], Search, ReferenceEntry |
| `study_notes` | Inspect passage commentaries, cross-references, and personal notes | `reference_footnotes` | Header[back], ParallelCompare[interleaved], KeyValue, Composer[entry] |

Each archetype's `defaultLayout` is its first listed layout; all layout ids are `reference_`-prefixed and
unique. Recipes use only core plus `reference`, stay at or below weight 7, and place at most one dense
weight-3 component on any screen.

## Worked example: Olive & Folio (scripture & reference reader)

A study companion combines offline scripture, a lexicon, and encyclopedia notes. Opening
`scripture_read/reference_navigate` uses `VersePicker` to jump to `John 3` in `ESV`, opening
`reference_verse` (`ScriptureText` in sepia paper) where tapping verse 16 highlights it and opens
`scripture_read/reference_parallel` to compare `ESV` and `KJV` side by side on `ParallelCompare`. Each
morning, `devotional_hub/reference_today` ticks off the day's readings on `StudyPlan`. Meanwhile, looking
up "agape" in `lookup_entry/reference_word` renders IPA phonetics and four numbered senses in
`LexiconEntry`, `lookup_entry/reference_encyclopedia` reads a cited historical entry on `ReferenceEntry`,
and `study_notes/reference_footnotes` captures interleaved translation notes. Signature: `check_burst` on
completing a daily reading plan or `streak_flame` on study streaks.

## Tiers

All six components work on the `phone` with bundled corpora (`ScriptureText`, `VersePicker`, `StudyPlan`,
`LexiconEntry`, `ParallelCompare`, `ReferenceEntry`). Syncing reading progress across devices uses `people`,
and downloading extra encyclopedia articles or translations uses a `service` feed.

## Build notes

- Order: `ScriptureText`, `VersePicker`, `ParallelCompare`, `StudyPlan`, `LexiconEntry`, `ReferenceEntry`.
- Reuse `KitScroll`, `KitMeter`, `KitRank`, `KitTrack`, `KitChip`, and `KitContent`; no new kit base or
  signature is needed.
- Never confuse `reference` (scripture, dictionaries, encyclopedias) with `books` (small-business cash
  bookkeeping) or `media` (general ebook/podcast libraries).
- Pair `reference` with `learning` for scripture/vocab flashcards and with `mind` for devotional reflection
  journaling.

## Open questions

- **New actions?** None. Verse jumps, translations, highlights, bookmarks, audio pronunciation, and copies
  map to `select`, `toggle`, `check`, `play`, `copy`, and `press`.
- **Strong's / interlinear morphology popovers?** Handle concise glosses inside `ParallelCompare`
  `interleaved` rows; full grammatical trees wait for misses.

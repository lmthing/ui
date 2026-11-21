# `kids` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Pre-reader and early-childhood companions: avatar
switchers, phonics soundboards, read-along picture pages, sticker boards, visual routines and parent gates.
Not school grading (`learning`), not parent monitoring (`parenting`).

## Purpose

Child-safe, pre-reader and early-elementary experiences on a shared family phone or tablet: large illustrated
child profile switchers, tap-to-hear phonics and animal soundboards, illustrated read-along picture-book
pages, visual collectible sticker boards, icon-first morning/bedtime routines, and COPPA-compliant parental
gates protecting parent settings or outbound links. Focuses on child-facing UX, not older-student graded
assessments (`learning`), parent screen-time or baby logs (`parenting`), or freehand drawing canvases (`Canvas`).

## Apps it serves

Preschool phonics & early-reading companion, toddler visual morning/bedtime helper, kid-safe audio storybook
player, shared family tablet child launcher, preschool reward sticker book.

## What the core already covers

- Simple celebration screen: `Success`; bedtime or reading countdown: `Timer`; picture cards: `Photo`, `Card`.
- Parent-side profile facts: `Profile`, `KeyValue`; simple browse shelves for stories: `List[shelf]`.
- Finger painting, letter stroke tracing, and open 2D physics sandboxes stay `Canvas`.

`KidSwitch` lets non-readers switch profiles visually via oversized character cards; `SoundGrid` triggers
short bundled phonics/animal audio clips with visual pulses; `StoryPage` displays read-along picture spreads
with narration toggles; `StickerBoard` tracks earned color stickers vs locked silhouettes; `VisualRoutine`
guides pre-readers through 3–6 icon steps; `ParentGate` blocks adult settings behind a 3-second hold or
randomized arithmetic check.

## Components (6)

### `KidSwitch` · planned · input · phone
Large illustrated animal or character avatar cards showing each child's first name, age-band pill (`2-4`,
`5-6`, `7-8`), `Swatch` background tint, and active selection ring for one-tap profile switching on a shared
family device, paired with a quiet parent-corner button that opens `ParentGate`.
- Pick: switching visually between child profiles on a shared family device. Not one adult profile
  (`Profile`), adult team rosters (`People`), or random party teams (`play/TeamPicker`).
- Writes: `children` of `childId` text(24), `name` text(16), `avatar` (`photo` ref or character icon),
  `swatch` closed `Swatch` enum, `ageBand` (`2-4`, `5-6`, `7-8`), 1–6; `activeId` text(24); `parentGoto`
  optional; `style`. Active child label and age filtering follow from `activeId`.
- Styles: `cards` (default, oversized illustrated tiles), `strip` (compact top profile switcher rail).
- Parts → actions: children `root select`, `parent press` (opens `parentGoto`).
- States: filled, empty (no child profiles created yet), loading.
- Real path: local child profiles stored on the shared device with zero online accounts; switching profiles
  updates the active child's routine, story progress, and sticker collection.

### `SoundGrid` · planned · action · phone
Four to twelve oversized illustrated tiles (letters, phonics, animals, numbers, or musical notes) tinted
with closed `Swatch` colors that play a short bundled audio clip and pulse visually on tap. Tapping a second
tile stops the first clip cleanly so short sounds never collide.
- Pick: playing short bundled phonics, word, animal, or note clips from large visual tiles. Not scrubbing
  long audio tracks (`Player`), ambient multi-track mixers (`mind/Soundscape`), or adult shortcuts (`Actions`).
- Writes: `title` text(28), `tiles` of `tileId` text(24), `label` text(12), `sub` text(16) optional (such as
  phonetic cue `/b/`), `icon` or `photo`, `swatch` closed `Swatch` enum, `media` (bundled local short audio
  ref), 4–12; `style`. Active playing tile is host runtime state, never a model-written prop.
- Styles: `tiles` (default, 2-column or 3-column illustrated soundboard), `letters` (large letter-first
  phonics tiles).
- Parts → actions: tiles `root play` (starts short clip on tap), tiles `root stop` (stops active clip).
- States: filled, empty, loading, error (bundled audio clip unavailable).
- Real path: bundled offline audio assets played locally through `MediaAdapter` with zero network calls or
  advertising trackers.
- Density: `meta.dense: true`, weight 3; early-childhood soundboards require 4–12 large interactive tiles on
  one screen.

### `StoryPage` · planned · content · phone
Picture-book spread displaying a large landscape or square illustration, one to three short lines of oversized
read-along text, a read-aloud narration toggle (`play` / `pause`), and prominent Previous and Next page
controls with a visual page counter. Page bounds disable Previous on page 1 and Next on the final page.
- Pick: presenting illustrated read-along picture-book spreads for pre-readers and early readers. Not long
  prose articles (`Article`), older-student graded lessons (`learning/Lesson`), or captionless photo carousels
  (`Gallery`).
- Writes: `bookTitle` text(32), `page` int 1–24, `totalPages` int 1–24 (`page` ≤ `totalPages`), `illustration`
  (`photo` ref), `lines` text(80) each 1–3, `narration` (optional local audio ref), `style`. Page boundary
  locks and completion state follow from `page` and `totalPages`.
- Styles: `spread` (default, illustration above oversized text and page controls), `immersive` (full-bleed
  illustration with caption strip).
- Parts → actions: `narrate play`, `narrate pause` (when `narration` is set), `prev press`, `next press`.
- States: filled, loading, success (reached final page), error (story page asset missing).
- Real path: offline bundled or cached story pages and local narration tracks played through `MediaAdapter`
  without external ad links.

### `StickerBoard` · planned · data · phone
Themed reward board of six to twelve visual slots displaying earned stickers in full color and locked slots as
quiet silhouettes with simple pictorial unlock icons. Tapping an earned sticker pops its cheerful caption;
earned count and full-board completion are computed automatically.
- Pick: collecting and showing visual reward stickers for young children. Not adult money jars (`home/Rewards`),
  text course badges (`learning/Achievements`), or shopping wishlists (`inventory/Wishlist`).
- Writes: `themeTitle` text(28), `stickers` of `stickerId` text(24), `label` text(16), `icon` or `photo`,
  `earned` boolean, `hintIcon` optional, 6–12; `style`. Earned count (`N of M`) and completion status are
  computed by code.
- Styles: `board` (default, 3-column sticker collection on themed scene), `shelf` (two-row collectible cards).
- Parts → actions: stickers `root press` (highlights sticker label and unlock hint).
- States: filled, empty (0 earned; all silhouettes visible), loading, success (entire board earned).
- Real path: sticker awards stored locally per child profile and unlocked when routines or stories finish.
- Density: `meta.dense: true`, weight 3; collectible sticker boards display 6–12 visual slots together.

### `VisualRoutine` · planned · input · phone
Three to six oversized icon-first routine cards (such as Wake, Brush Teeth, Book, Bed) pairing short 1–2 word
labels and `Swatch` tints with large tap-to-complete checkboxes that trigger a star mark when checked. Shows
pictorial progress (`3 of 4`) and keeps steps in morning, afternoon, or bedtime sequence.
- Pick: guiding pre-readers through 3–6 daily morning or bedtime steps visually. Not text checklists
  (`Checklist`), family chore lists (`home/Chores`), or schedules (`Timeline`).
- Writes: `title` text(24), `period` (`morning`, `afternoon`, `bedtime`), `steps` of `stepId` text(24),
  `label` text(18), `icon` or `photo`, `swatch` closed `Swatch` enum, `done` boolean (default false), 3–6;
  `style`. Completed count and full-routine celebration follow from `done` flags.
- Styles: `cards` (default, large tactile routine cards), `sequence` (ordered step rail emphasizing the next
  unfinished step).
- Parts → actions: steps `done check`, `reset press` (clears daily ticks). `meta.confirmParts: ["reset"]`.
- States: filled, loading, success (all steps checked with star celebration).
- Real path: daily visual routine ticks saved locally per child profile on the device, resetting on a new day
  or parent reset.

### `ParentGate` · planned · action · phone
Adult verification card requiring either a continuous 3-second press-and-hold radial countdown (`KitHoldButton`)
or solving a runtime-generated written arithmetic prompt before opening parent settings, purchases, or
external links inside a child-facing app. Passing navigates directly to `targetGoto`.
- Pick: gating adult-only settings, external links, or purchases inside a child-facing app. Not business
  waivers (`customers/Agreement`), MFA push approvals (`security/PushChallenge`), or delete confirms
  (`Button.confirm`).
- Writes: `title` text(32), `reason` text(80), `mode` (`hold`, `math`), `holdSeconds` int 3–5 (default 3,
  `hold` mode only), `targetGoto` (screen id unlocked upon passing), `style`. In `math` mode, code generates
  a randomized two-number arithmetic question at runtime so the model never emits static predictable answers.
- Styles: `gate` (default, dedicated verification card with clear back cue), `compact` (inline gate strip).
- Parts → actions: `hold press` (`hold` mode; dispatches only after full continuous hold on `KitHoldButton`),
  `answer type`, `submit press` (`math` mode).
- States: filled (locked), loading, success (verified, opens `targetGoto`), error (wrong math answer or hold
  released early).
- Real path: enforces COPPA / Teacher-Approved adult gating locally on the device before mounting settings,
  billing, or external link screens; zero child telemetry is collected.

## Archetypes (3)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `kids_playroom` | Pick child profile and play phonics sounds | `kids_home`, `kids_sounds` | `kids_home`: Header, KidSwitch, VisualRoutine, Actions · `kids_sounds`: Header, Chips, SoundGrid |
| `kids_storytime` | Browse picture books and read along | `kids_library`, `kids_book` | `kids_library`: Header, Search, Chips, List[shelf], Button · `kids_book`: Header[back], StoryPage, Note |
| `kids_routine` | Follow visual routines, stickers, and parent gate | `kids_daily`, `kids_stickers`, `kids_parent` | `kids_daily`: Header, VisualRoutine, Note · `kids_stickers`: Header[back], StickerBoard, Note · `kids_parent`: Header[back], ParentGate, Note |

Defaults: `kids_playroom/kids_home`, `kids_storytime/kids_library`, `kids_routine/kids_daily`. Layout ids are
`kids_`-prefixed and unique across the catalog. Recipes use only core plus `kids`, stay within weight 12, and
place at most one dense component (`SoundGrid` or `StickerBoard`) on a screen.

## Worked example: SunnySprout

A pre-reader phonics, visual routine, and story companion app, separate from Ledge and Trot. On
`kids_playroom/kids_home`, four-year-old Leo taps his yellow otter tile in `KidSwitch` and ticks Brush Teeth
and Put On PJs in `VisualRoutine`. Tapping Sounds opens `kids_playroom/kids_sounds` where `SoundGrid` plays
eight bundled phonics tiles (`A /æ/`, `B /b/`, `C /k/`). In `kids_storytime/kids_book`, `StoryPage` displays
an illustrated woodland spread with two short read-along lines and local narration playback. Finishing earns a
new owl sticker on `kids_routine/kids_stickers` (`StickerBoard`, `5 of 9` earned), while tapping the parent
corner routes through `kids_routine/kids_parent` (`ParentGate` using `KitHoldButton`). Signature: core
`check_burst` on completing a visual routine card.

## Tiers

All six components run 100% locally on the phone (`phone` tier) with bundled audio/visual assets and zero
accounts, ads, or external tracking. Parent settings behind `ParentGate` may optionally link to `parenting`
screen-limit controls (`ok`) or `media` kid-safe audio libraries without adding dependencies to `kids`.

## Build notes

- Order: `KidSwitch`, `VisualRoutine`, `StoryPage`, `SoundGrid`, `StickerBoard`, then `ParentGate` alongside
  wave-6 `KitHoldButton`; all remain planned.
- Build wave-6 base `KitHoldButton` (shared with `safety/SosBeacon`) before `ParentGate`; all other drawings
  compose existing `KitCard`, `KitGrid`, `KitTile`, `KitPhoto`, `KitIcon`, `KitPlayback`, `KitCheck`,
  `KitInput`, `KitText`, and `KitAction`.
- Writers use strict `writerFormat(registry)` for core plus selected packs only; no aliases or off-pack ids.
  Tile/step colors must use the closed `Swatch` enum.
- `SoundGrid` and `StickerBoard` are weight 3 (`meta.dense: true`) with 4–12 and 6–12 tiles respectively;
  all other lists cap at 6 items. `ParentGate` math challenges must be generated in code at runtime, never
  model-written props.
- `VisualRoutine.reset` uses `meta.confirmParts`. Audio playback must release `MediaAdapter` cleanly on
  navigation and obey reduced-motion/mute states.

## Open questions

- **New action names?** None. Hold completion (`KitHoldButton`), parent entry, story navigation, sticker tap,
  reset, and math submit use `press`; short sound tiles and story narration use `play`/`pause`/`stop`;
  profile choice uses `select`; routine completion uses `check`; math input uses `type`.
- **Finger painting or letter tracing?** Default: out of scope (`Canvas`); declarative `kids` covers visual
  profiles, soundboards, read-alongs, sticker rewards, routines, and parent gating.
- **Voice reading assessment?** Default: out of scope for `kids`; older-kid pronunciation checks belong in
  `learning` (`SpeechCheck`).

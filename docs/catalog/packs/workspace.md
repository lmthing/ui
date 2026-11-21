# `workspace` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Collaborative cloud files, nested folders, quick notes and structured wiki pages with sharing permissions. Not local device files (`utilities`), personal IDs/tax (`paperwork`), or published books (`media`).

## Purpose

Collaborative cloud storage, rapid note-taking boards, and structured team wikis: nested breadcrumb folder
trees, cloud account quota breakdowns, link/role sharing access controls, color-toned sticky note grids,
structured wiki pages with properties and toggle blocks, margin review comments with suggested edits, and
named document version histories. Default showcases run on local seed snapshots; multi-person edits,
sharing ACLs, and remote file sync require a shared cloud workspace service. Spreadsheet formula grids and
raw PDF ink annotation stay in `Canvas`.

## Apps it serves

Cloud drives and storage hubs (Google Drive, OneDrive, Dropbox, Google One), quick note and check-note
boards (Google Keep, Samsung Notes), and collaborative docs and wikis (Notion, Google Docs).

## What the core already covers

- Flat non-image attachments inside a form or message: `FileList`; simple lists of links or settings:
  `List` and `KeyValue`.
- Plain standalone checklists without colored cards or mixed notes: `Checklist`; single-sentence callouts:
  `Note`; long-form linear reading without wiki metadata or subpages: `Article`.
- Searching and filtering across items: `Search` and `Chips`; editing simple single-line properties:
  `Field`; writing one plain multi-line memo: `Composer[entry]`.
- Scanned receipts or personal IDs with expiry alerts: `paperwork`; local phone directory browsing:
  `utilities/FileBrowser`; project milestones and task charters: `projects`.

`DriveTree` stays for hierarchical breadcrumb folder navigation, shared/offline flags, and grid/list file
toggling rather than flat `FileList` attachments or local `utilities/FileBrowser`. `CloudQuota` breaks
down storage across multiple workspace services with cleanup/upgrade triggers instead of a single
`Progress` bar or `Bars[share]`. `ShareAccess` enforces link-visibility (`restricted`, `org`, `anyone`)
and per-collaborator roles (`viewer`, `commenter`, `editor`). `QuickNotes` handles 2-column colored sticky
cards with inline checklists; `DocPage` holds wiki properties, toggle callouts, and subpages; `DocComments`
anchors review threads and suggested-edit diffs to quoted passages; and `VersionHistory` tracks named
revisions with confirmed restores. These packs are neighbours, never dependencies.

## Components (7)

### `DriveTree` · planned · content · phone
A collaborative cloud folder hierarchy with interactive path breadcrumbs and switchable list or two-column
grid views. Each row or card displays a file-type icon, owner name, shared indicator, byte size, modified
date, and offline-pin toggle. Header triggers upload new files or create folders in the current path.
- Pick: navigating nested collaborative cloud folders and shared drives. Not local device storage paths
  (`utilities/FileBrowser`), flat attachments (`FileList`), physical boxes (`inventory/Storage`), or
  personal life-admin IDs (`paperwork/Documents`).
- Writes: `breadcrumbs` of `id` text(24), `label` text(20), 1–5, `items` of `id` text(24), `name`
  text(36), `kind` (`folder`, `doc`, `sheet`, `slide`, `pdf`, `image`, `archive`, `other`), `owner`
  text(24), `shared` boolean (default false), `pinnedOffline` boolean (default false), `size` text(12)
  optional (omitted on folders), `modified` text(12), `goto` optional, 0–24; `style`. Code renders
  folders before files or follows sort order cleanly without inventing sizes.
- Styles: `list` (default, dense rows with owner, modified date, and trailing pin/share actions), `grid`
  (two-column thumbnail and icon cards).
- Parts → actions: `breadcrumbs root press`, `items root press`, `items pin toggle`, `items share press`,
  `upload press`, `newFolder press`.
  `meta.partTiers: { share: "people", upload: "service" }`.
- States: filled, empty (empty folder), loading, error (drive sync failed).
- Real path: folder metadata and offline-pinned files cached on the device; uploading files and sharing
  folders require cloud sync (`!needs-service`) and collaborators (`!needs-people`).
- Density: `meta.dense: true`, weight 3; cloud folder listings hold up to 24 files and subfolders.

### `CloudQuota` · planned · data · phone
A cloud account storage breakdown across workspace services such as Drive, Mail, Photos, and Trash. A
stacked meter bar visualizes each service's share alongside computed total gigabytes used and remaining
capacity. Per-service links, a cleanup shortcut, and an upgrade CTA help reclaim space.
- Pick: showing cloud storage usage split across multiple services with cleanup and upgrade triggers. Not
  a single goal bar (`Progress`) or generic financial spending shares (`Bars[share]`).
- Writes: `planName` text(24), `limitGb` number > 0, `services` of `id` text(16), `label` text(20),
  `usedGb` number ≥ 0, `goto` optional, 2–5; `cleanupGoto` optional; `upgradeGoto` optional; `style`.
  Total used GB, free GB, used percentage, and over-quota/warning tones are computed by code from
  `services` and `limitGb`.
- Styles: `breakdown` (default, stacked bar + per-service rows + actions), `compact` (single meter +
  headline usage and upgrade link).
- Parts → actions: `services root press` (opens `goto`), `cleanup press` (`cleanupGoto`), `upgrade press`
  (`upgradeGoto`).
- States: filled, empty, loading, error (quota telemetry unavailable).
- Real path: storage accounting retrieved from the cloud account service or cached locally; large-file
  cleanup opens filtered views without deleting files automatically.

### `ShareAccess` · planned · input · people
A sharing permissions panel for controlling link visibility (`restricted`, `org`, `anyone`) and individual
collaborators. Each collaborator row shows an avatar, name or email, and a role picker (`viewer`,
`commenter`, `editor`) with confirmed removal. An invite input and Copy link button complete the access
workflow.
- Pick: managing link visibility, inviting collaborators, and changing access roles on a cloud file or
  wiki page. Not workplace org directories (`team/TeamDirectory`) or community invites (`social/Invite`).
- Writes: `resource` text(36), `visibility` (`restricted`, `org`, `anyone`), `orgName` text(24) optional,
  `collaborators` of `id` text(24), `name` text(24), `email` text(40), `photo` optional, `role` (`owner`,
  `viewer`, `commenter`, `editor`), 1–6; `inviteDraft` text(40) optional; `link` text(120) optional;
  `style`. Owners cannot have their role downgraded or be removed in the UI.
- Styles: `panel` (default, visibility + collaborators + invite + copy link), `compact` (link visibility
  and copy link only).
- Parts → actions: `visibility select`, `collaborators role select`, `collaborators remove press`,
  `invite type`, `inviteSend press`, `copyLink copy`.
  `meta.confirmParts: ["remove"]`.
- States: filled, loading, success (access updated or link copied), error (invalid email or permission
  denied).
- Real path: ACL changes and link-sharing settings update through a shared workspace permissions service;
  copying the link writes to the device clipboard.

### `QuickNotes` · planned · content · phone
A two-column grid or stacked list of color-toned quick sticky notes and check-notes. Each card carries an
optional semantic tone, title, text snippet or up to four inline checkable tasks, and label chips. Tapping
opens the note while quick actions pin, archive, or confirm-delete it.
- Pick: rapid sticky notes, color-coded memos, and inline quick check-notes. Not mood and feeling logs
  (`mind/Entries`), structured wiki pages (`DocPage`), or standalone task checklists (`Checklist`).
- Writes: `notes` of `id` text(24), `title` text(32) optional, `body` text(160) optional, `checks` of
  `text` text(32), `done` boolean, 0–4, `tone` (`default`, `sand`, `sage`, `sky`, `plum`, `rose`) (default
  `default`), `labels` text(14) each 0–3, `pinned` boolean (default false), `archived` boolean (default
  false), `goto` optional, 1–16; `style`. Code groups pinned notes above others and computes completed
  check counts.
- Styles: `grid` (default, two-column quick-note cards), `list` (single-column rows).
- Parts → actions: `notes root press`, `notes check check` (toggles inline checklist item), `notes pin
  toggle`, `notes archive press`, `notes delete press`.
  `meta.confirmParts: ["delete"]`.
- States: filled, empty, loading, error (note save failed).
- Real path: notes and inline check states stored locally on the device and synced optionally with a cloud
  notes backend.
- Density: `meta.dense: true`, weight 3; quick-note boards scan up to 16 cards with inline check items.

### `DocPage` · planned · content · phone
A structured workspace wiki page featuring a page icon, title, and metadata properties (`status`, `owner`,
`updated`, `tags`). The body mixes prose paragraphs with collapsible callout and toggle blocks, nested
subpage links, and a comment count badge. Tapping toggles expands content in place while links open
subpages or comments.
- Pick: viewing structured workspace wiki pages with metadata properties, collapsible toggle blocks, and
  subpages. Not plain linear essays (`Article`), simple key-value tables (`KeyValue`), or formal project
  charters (`projects/ProjectBrief`).
- Writes: `title` text(48), `icon` optional, `properties` of `label` text(16), `value` text(28), 0–5,
  `blocks` of `id` text(24), `kind` (`paragraph`, `callout`, `toggle`), `heading` text(48) optional,
  `text` text(400), `open` boolean (default false, `toggle` only), 1–8, `subpages` of `title` text(32),
  `icon` optional, `goto`, 0–5, `commentCount` int ≥ 0 (default 0); `commentsGoto` optional; `shareGoto`
  optional; `style`.
- Styles: `page` (default, full wiki page with properties, blocks, and subpages), `compact` (condensed
  properties and outline).
- Parts → actions: `blocks root toggle` (toggles `toggle` blocks open/closed), `subpages root press`,
  `comments press` (`commentsGoto`), `share press` (`shareGoto`, `meta.partTiers: { share: "people" }`).
- States: filled, empty, loading, error (document unavailable).
- Real path: wiki pages stored locally or synced from a collaborative workspace; live multi-user presence
  and sharing permissions use `ShareAccess` (`!needs-people`).

### `DocComments` · planned · content · people
Margin review threads and suggested text edits anchored to quoted passages in a document. Each thread
displays the quoted excerpt, author avatar, timestamp, comment body, optional replacement diff, and a
Resolve or Reopen toggle. Reviewers can jump to the passage, reply, or accept and reject suggestions.
- Pick: reviewing document comments and suggested text edits tied to quoted passages. Not social post
  replies (`social/Comments`), 1:1 chats (`Bubbles`), or support tickets (`requests/RequestThread`).
- Writes: `threads` of `id` text(24), `quote` text(100), `author` text(24), `photo` optional, `time`
  text(12), `comment` text(240), `suggestion` text(160) optional, `replies` int ≥ 0 (default 0),
  `resolved` boolean (default false), `goto` optional, 1–6; `style`. Code filters open vs all threads
  based on view state; overflows beyond six use shared "and N more" copy.
- Styles: `open` (default, unresolved comments and pending suggestions), `all` (includes resolved
  threads).
- Parts → actions: `threads root press` (scrolls to quoted passage), `threads resolve toggle`,
  `threads reply press` (focuses `Composer[reply]`), `threads accept press` (suggestions only),
  `threads reject press` (suggestions only).
  `meta.confirmParts: ["reject"]`.
- States: filled, empty (no open comments), loading, success (comment resolved or suggestion applied).
- Real path: anchored document threads and edit suggestions stored on the shared workspace document;
  new replies post via core `Composer[reply]`.

### `VersionHistory` · planned · data · phone
A chronological document revision timeline listing named checkpoints and autosaved snapshots. Each entry
displays its version label, timestamp, editor avatar and name, and a short change summary. Tapping previews
a snapshot while Restore replaces the active head only after confirmation.
- Pick: inspecting named document revisions and restoring an earlier snapshot. Not workspace-wide change
  logs (`data/ActivityLog`) or daily schedules (`Timeline`).
- Writes: `document` text(36), `versions` of `id` text(24), `label` text(24) optional, `timestamp` ISO
  datetime with offset, `editor` text(24), `photo` optional, `summary` text(60), `current` boolean
  (default false), `goto` optional, 1–6; `style`. Code disables Restore on the active `current` version
  and orders newest first.
- Styles: `versions` (default, named/major checkpoints), `detailed` (includes intermediate autosave
  revisions).
- Parts → actions: `versions root press` (preview snapshot), `versions restore press`.
  `meta.confirmParts: ["restore"]`.
- States: filled, empty, loading, success (version restored), error (snapshot unavailable).
- Real path: revision snapshots retained locally or in cloud version history; restoring writes a new head
  revision without discarding prior snapshots.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `drive_home` | Cloud folders, files and storage quota | `workspace_files`, `workspace_quota` | `workspace_files`: Header, Search, Chips, DriveTree, Button · `workspace_quota`: Header[back], CloudQuota, List, Button |
| `note_board` | Sticky quick notes and note editor | `workspace_grid`, `workspace_edit` | `workspace_grid`: Header, Search, Chips, QuickNotes, Button · `workspace_edit`: Header[back], Field, Chips, Composer[entry], Checklist, Button |
| `doc_view` | Wiki page, margin comments and revisions | `workspace_page`, `workspace_comments`, `workspace_history` | `workspace_page`: Header[back], DocPage, FileList · `workspace_comments`: Header[back], Segmented, DocComments, Composer[reply] · `workspace_history`: Header[back], VersionHistory, Note |
| `share_sheet` | Manage link access and collaborators | `workspace_access` | Header[back], Card, ShareAccess, Note, Button |

The first listed layout is each archetype's `defaultLayout`; every layout id is `workspace_`-prefixed and
unique across the catalog. Recipes use only core components (including Wave 6 `FileList`) plus `workspace`
pack components, allow at most one dense component (`DriveTree` or `QuickNotes`) per layout, and keep
screen weights within 4–8.

## Worked example: Slate

A design studio's collaborative workspace built with `workspace`. `drive_home/workspace_files` opens the
shared `"Brand Refresh"` folder in `DriveTree` alongside offline-pinned briefs and an upload trigger,
while `workspace_quota` monitors `CloudQuota` across Drive, Mail, and Photos. `note_board/workspace_grid`
organizes colored brainstorm cards and quick checklists in `QuickNotes`, with `workspace_edit` opening
core `Field`, `Composer[entry]`, and `Checklist` to edit one note. Inside `"Q4 Launch Wiki"`,
`doc_view/workspace_page` pairs `DocPage` properties and toggle callouts with `FileList` attachments;
`workspace_comments` reviews a suggested edit in `DocComments` with `Composer[reply]`;
`workspace_history` inspects named snapshots in `VersionHistory`; and `share_sheet/workspace_access` sets
org visibility and editor roles in `ShareAccess`. Signature: `check_burst` on completing inline checks
in `workspace_edit`; no new signature proposed.

## Tiers

`CloudQuota`, `QuickNotes`, `DocPage`, and `VersionHistory` run locally (`phone`) over stored or cached
records. `DriveTree` works over cached folders (`phone`) with sharing marked `!needs-people` and uploads
marked `!needs-service`. `ShareAccess` and `DocComments` require collaborators (`people`), with sharing
links and real-time review syncing backed by a shared workspace service.

## Build notes

- Order: `QuickNotes`, `CloudQuota`, `DriveTree`, `DocPage`, `VersionHistory`, `ShareAccess`,
  `DocComments`; all remain planned.
- No new kit base is required; compose from existing `KitCard`, `KitRow`, `KitGrid`, `KitStrip`, `KitPhoto`,
  `KitIcon`, `KitText`, `KitTrail`, `KitShare`, `KitCheck`, `KitChip`, `KitOption`, `KitInput`, and
  `KitAction`.
- Strict `writerFormat(registry)` admits only core plus chosen packs; no aliases or off-pack fallbacks.
  Each component ships two examples, choose/write/read probes, kit-only renderers, and a pack
  `example.jsonl` rendered in three presets.
- `DriveTree` and `QuickNotes` carry `meta.dense: true` (weight 3); `DocComments` and `VersionHistory`
  cap at six items with shared "and N more" overflow copy.
- Destructive or mutating actions (`ShareAccess.remove`, `QuickNotes.delete`, `DocComments.reject`,
  `VersionHistory.restore`) declare `meta.confirmParts` and route through shared confirmation.
- `CloudQuota` computes total used GB, remaining space, and percentages from per-service numbers and
  `limitGb`; Writers never emit pre-computed percentage strings.

## Open questions

- **New action names?** None. Toggling folders/blocks/pins uses `toggle`; inline checklists use `check`;
  role and visibility pickers use `select`; copying share links uses `copy`.
- **Spreadsheet grids & PDF ink markup?** Out of scope for declarative schemas; multi-cell formulas and
  freehand PDF annotations remain `Canvas` / native viewers.
- **Combining with `projects` or `comms`?** Optional Director combinations (`workspace + projects` or
  `workspace + comms`); no recipe depends on another pack.

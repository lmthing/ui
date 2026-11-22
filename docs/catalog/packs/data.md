# `data` pack

**Status:** revised · **Wave:** 5 · **Pick line:** Running something behind the scenes: tables, boards,
reports. Not personal tracking (core).

## Purpose

The back office of a small operation: many records at once, sorted and filtered, moved through stages,
changed in bulk, and summarised in charts. Any pack component allowed by the README's density rule may
be dense.

## Apps it serves

Shop stock and orders admin (with `inventory`, `commerce`), club membership records, leads by stage (with
`customers`), content calendar, request or bug tracker, school club register, survey results, a personal
kanban for a project.

## What the core already covers

- A short list of records: `List`; facts about one record: `KeyValue`; editing a record: `Field`s and
  `Button`.
- Two to four headline numbers: `Stats` (the first plan's `Kpi` is dropped as its duplicate).
- Amounts across up to seven categories: `Bars`; shares of a whole: `Bars` style `share` (the first plan's
  `Donut` is dropped for it); progress against targets: `Progress`.
- A few one-word filters: `Chips`; switching views: `Segmented`; finding by name: `Search`. In Wave 6,
  `FilterBar` is proposed for **Core promotion** so `realestate`, `ticketing`, `stays`, `commerce`,
  `auto`, `places`, `hiring` and `data` can share multi-field filtering without cross-pack dependency.

## Components (9)

### `Table` · planned · data · phone
Rows and columns for many records: a sticky first column, sortable headers, numbers right-aligned, status
cells as pills, a tick box per row when rows can be selected, and the row count at the foot; scrolls
sideways when wider than the phone.
- Pick: many records compared across several fields. Not a few things to scan (`List`), not one record's
  facts (`KeyValue`), not a league table (sports `Standings`).
- Writes: `columns` of `label` text(14), `kind` (`text`, `number`, `money`, `date`, `status`), 2–6; `rows`
  of `cells` (text(24) for text and status, numbers for number and money, dates for date; one per column),
  `goto` optional, 1–20; `sort` column index optional; `selectable` boolean; `summaryRow` (`sum`, `avg`,
  `count`) optional; `exportable` boolean optional.
- Styles: density: `compact` (default), `comfortable`; group: `none` (default), `sections`;
  detail: `full` (default), `brief`. Migrate `style: "compact"` to compact density, and `style: "grouped"`
  to group sections. Group by the first status column (first column if none); sort within groups.
- Parts → actions: `matrix`, `header select`, `summary`, `count` (full detail), `empty`,
  `export press` (with `exportable` and an available host command), `export_label`, `export_status`;
  rows `root press` (when linked), rows `pick check` (with `selectable`), rows `group_heading`
  (first row of a section), rows `status_1` through `status_6` (status cells).
- States: filled, empty, loading. · Real path: a query over records on the device. · Kit: `KitTable`.
- Wave 6 options: `summaryRow` computes `sum` or `avg` for every numeric and money column (requires
  at least one), or `count` for all records. The footer is independent of the row count in full detail.
  `export press` requests the host command `data.exportTable` at service tier. Sorting waits while
  the export is pending; selection and record links remain usable.

### `Board` · planned · data · phone
Columns of cards for stages (To do, Doing, Done; New, Quoted, Won), each card with a title, a tag, a person
and an optional value, a count and value total per column, cards movable between columns.
- Pick: things moving through stages, including leads becoming clients. Not one list of jobs
  (`Checklist`), not a week of shifts (team `Roster`).
- Writes: `columns` of `label` text(14), 2–5; `cards` of `title` text(32), `column` index, `tag` text(12)
  optional, `who` text(16) optional, `swimlane` text(16) optional, `value` number optional, `goto`, 1–16.
  Column totals are computed within each swimlane when there are swimlanes. Up to four swimlanes,
  including the optional group for unassigned cards.
- Styles: density: `compact` (default), `comfortable`; surface: `plain` (default), `outlined`;
  arrange: `strip` (default), `rows`.
- Parts → actions: `columns`, `empty`, `swimlane_1` through `swimlane_4` (one per visible group);
  cards `root press`, cards `root move` (to a column label), cards `title`, `tag`, `who`, `value`.
  · States: filled, empty.
- Real path: records with a stage field on the device. · Renderer: `StageBoard` over `KitColumns`.
- Wave 6 options: optional `swimlane` groups cards across the same stages without changing move
  destinations. Pending shared renderer support: `style: "list"` (vertical collapsible stage stacks
  for mobile), and `wipLimit` per column (`warn`/`bad` tone).

### `FilterBar` · planned · input · phone
The controls above a table or board: a search box, up to four filter buttons each opening its own small
picker, the active filter count, the sort order and a clear action.
- Pick: narrowing many records by several fields. Not a few one-word filters (`Chips`), not switching views
  (`Segmented`).
- Writes: `hint` text(40), `filters` of `label` text(14), `options` text(16) each, 2–8, `value` optional,
  1–4; `sort` text(20) optional. The pickers are drawn by `FilterBar` itself, not a `Sheet`.
- Parts → actions: `field type`, filters `root select` (an option label), `clear press`.
- States: filled. · Real path: a query built on the device.
- Wave 6 note: proposed for **Core promotion** so search and multi-filter screens across packs reuse one control without cross-pack dependencies.

### `LineChart` · planned · data · phone
One to three series over time as lines with labelled axes and the latest values; tapping reads a point.
- Pick: how numbers changed over many points. Not up to seven amounts compared (`Bars`), not a small trend
  under a number (`Sparkline`), not a holding's price (money `PriceChart`).
- Writes: `title` text(32), `unit` text(8) optional, `labels` text(6) each, 4–31; `series` of `label`
  text(16), `values` numbers matching `labels`, 1–3; `goal` number optional;
  `range` (`7d`, `30d`, `90d`, `1y`) optional.
- Styles: density: `comfortable` (default), `compact`; detail: `full` (default), `brief`;
  surface: `card` (default), `outlined`.
- Parts → actions: `title`, `axes`, `unit`, `goal` (when supplied), `latest` (full detail), `range` (when supplied),
  `reading` (selected point), `points`, `series_1`, `series_2`, `series_3`; points `root select`
  (reads the value). · States: filled, empty, loading.
- Real path: values aggregated from records on the device.
- Wave 6 options: an optional `goal` threshold line (`KitLinePlot`); optional `range` labels the time
  window covered by the supplied points. Pending plot support: `style: "area"`.

### `Heatmap` · planned · data · phone
A grid of cells shaded by value, as weeks of days (contribution style) or weekdays by two-hour blocks (busy
times), with a scale legend.
- Pick: patterns across many days or hours. Not which days have something (`Calendar`), not habits this
  week (health `HabitGrid`).
- Writes: `title` text(32), `unit` text(8), `style`; `weeks` of exactly 7 numbers, 4–26 (`weeks`); `days`
  of exactly 12 numbers, exactly 7 (`hours`).
- Styles: `weeks` (default), `hours`. · States: filled, loading.
- Real path: counts per day or block from records on the device.

### `BulkActions` · planned · action · phone
A bar that appears when rows of a `Table` are ticked: the count selected, select all, and two to four
actions such as archive, tag or export; delete asks first.
- Pick: doing one thing to many records at once. Not shortcuts (`Actions`), not one main action (`Button`).
- Writes: `items` of icon, label text(14), `danger` boolean, 2–4. The count comes from the ticked rows.
- Parts → actions: items `root press` (danger ones in `confirmParts`), `all press`.
- States: filled, empty (hidden while nothing is ticked). · Region: bottom.
- Real path: the action applied to the selected records on the device.

### `ActivityLog` · planned · data · people
Who changed what and when: rows with an avatar, a sentence ("Ana marked order 1042 as shipped"), the time and
a link to the record.
- Pick: an audit of changes by several people. Not one client's history (customers `ClientHistory`), not
  shift notes (team `Handover`), not a plan in time order (`Timeline`).
- Writes: `kind` (`all`, `created`, `updated`, `deleted`) optional; `entries` of `who` text(20),
  `photo`, `text` text(80), `time` text(12), `goto`, entry `kind` (`created`, `updated`, `deleted`)
  optional, `diff` optional (`old` text(28), `new` text(28)), 1–6.
- Styles: density: `comfortable` (default), `compact`; surface: `card` (default), `outlined`;
  lead: `avatar` (default), `none`.
- Parts → actions: `title` (empty), `kind select` (with categorized entries); items `root press`,
  `who`, `photo` (with avatar), `text`, `time`, `diff` (when supplied). · States: filled, empty, loading.
- Real path: a change log kept by a shared app.
- Wave 6 options: tagged entries expose a kind filter; by default it shows every entry, or
  `kind` seeds an existing category. An optional `diff` shows the before and after values.

### `Funnel` · planned · data · phone
An ordered two-to-six stage conversion breakdown displaying each stage's label, record count and optional monetary value beside horizontal bars scaled to the top stage. Step-to-step conversion percentages and overall conversion are computed automatically between stages.
- Pick: stage-by-stage drop-off and conversion rates across a sequential pipeline. Not independent categories (`Bars`), 100% part-to-whole shares (`Bars[share]`), or movable stage cards (`Board`).
- Writes: `title` text(32), `stages` of `label` text(20), `count` number ≥ 0, `value` number ≥ 0 optional, `goto` optional, 2–6; `unit` text(12) optional; `style`. Stage-to-step conversion percentages, overall conversion rate and bar ratios are computed by code.
- Styles: `bars` (default, scaled horizontal stage bars with conversion labels), `compact` (summary rows with step conversion pills).
- Parts → actions: stages `root press` (drills down when linked).
- States: filled, empty, loading.
- Real path: stage counts and totals aggregated from stored records on the device.

### `SavedViews` · planned · input · phone
Up to six named filter, sort and layout presets such as "Low stock" or "Overdue" with code-computed item counts per view. Tapping switches the active query view while saving or deleting manages presets cleanly.
- Pick: switching, saving or managing named query presets across records. Not ephemeral query controls (`FilterBar`), single-axis tags (`Chips`), or fixed screen tabs (`Segmented`).
- Writes: `views` of `id` text(24), `label` text(20), `summary` text(36) optional, `layout` (`table`, `cards`, `board`) optional, 1–6; `activeId` text(24) optional; `canSave` boolean (default true); `style`. Matching item counts per view are computed by code from the dataset.
- Styles: `chips` (default, horizontal preset strip with computed count badges), `list` (rows showing filter summaries with save and remove controls).
- Parts → actions: views `root select`, `save press`, views `remove press`. `meta.confirmParts: ["remove"]`.
- States: filled, empty, loading, success (preset saved or removed).
- Real path: saved filter and sort presets stored locally on the device.

## Archetypes (3)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `admin_list` | All records of one kind | `table`, `cards` | `table`: Header, SavedViews, FilterBar, Table, BulkActions · `cards`: Header, SavedViews, FilterBar, List |
| `report` | How it is going | `charts`, `funnel`, `patterns` | `charts`: Header, Segmented, Stats, LineChart, Bars[share] · `funnel`: Header, Segmented, Funnel, Note · `patterns`: Header, Heatmap, Bars |
| `board` | Work by stage | `kanban` | Header, FilterBar, Board |

## Worked example: Stockroom

A shop's back office (with `inventory`). `admin_list` shows 20 products in a `Table` sorted by stock, a
`FilterBar` for "low stock" and "supplier", and `BulkActions` to reorder the ticked rows. `report` shows
weekly sales as a `LineChart` and sales by category as `Bars[share]`, with busy hours as a `Heatmap`.
Signature: `bars_grow`.

## Tiers

`ActivityLog` needs other people. Everything else runs on the device over its own records.

## Build notes

- Order: `Table`, `FilterBar`, `LineChart`, `Board`, `BulkActions`, `Heatmap`, `ActivityLog`, then Wave 6 additions `Funnel` and `SavedViews`.
- `Table` and `Board` read compactly: a header line and one line per row, cells separated by `·`.
- Charts are drawn by kit bases; the model writes values only, never axes, ticks or colours.
- **Wave 6 additions & options:**
  - Added `Funnel` (`data`, `phone`) for 2–6 stage conversion drop-off breakdowns and `SavedViews` (`input`, `phone`) for up to six named query/layout presets.
  - Proposed Core promotion: `FilterBar` moves to Core so multi-field search and filter bars are shared across packs.
  - Option/style upgrades: `Table` gains section grouping alongside compact density, `summaryRow` and
    `export press`; `Board` gains optional `swimlane`; `LineChart` gains `goal` and `range`;
    `ActivityLog` gains `kind` and `diff`. Board folding and WIP tones and LineChart area fills await shared kit support.

## Open questions

- **Editing cells in place?** Default: no; a row opens its detail screen with `Field`s.

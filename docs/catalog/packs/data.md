# `data` pack

**Status:** revised · **Wave:** 5 · **Pick line:** Running something behind the scenes: tables, boards,
reports. Not personal tracking (core).

## Purpose

The back office of a small operation: many records at once, sorted and filtered, moved through stages,
changed in bulk, and summarised in charts. It is the only pack whose components may be dense, because the
person using it is working, not browsing.

## Apps it serves

Shop stock and orders admin (with `inventory`, `commerce`), club membership records, small CRM reports
(with `customers`), content calendar, bug or request tracker, school club register, survey results,
personal kanban for a project.

## What the core already covers

- A short list of records: `List`; facts about one record: `KeyValue`; one record's edit form: `Field`s
  and `Button`.
- Two to four headline numbers: `Stats` (the first plan's `Kpi` is dropped as its duplicate).
- Amounts across up to seven categories: `Bars`; progress against targets: `Progress`.
- A filter of a few chips: `Chips`; switching views: `Segmented`; finding by name: `Search`.

## Components (8)

### `Table` · planned · data · phone
Rows and columns for many records: a sticky first column, sortable headers, numbers right-aligned, a status
cell as a pill, and the row count at the foot; scrolls sideways when wider than the phone.
- Pick: many records compared across several fields. Not a few things to scan (`List`), not one record's
  facts (`KeyValue`), not a league table (sports `Standings`).
- Writes: `columns` of `label` text(14), `kind` (`text`, `number`, `money`, `date`, `status`), 2–6;
  `rows` of `cells` (text(24) each, matching columns), `goto` optional, 1–20; `sort` column index optional.
- Parts → actions: `header select` (sort), rows `root press`. · States: filled, empty, loading.
- Real path: a query over records on the device. · Kit: `KitTable`.
- Aliases: table, grid, spreadsheet, records, data table.

### `Board` · planned · data · phone
Columns of cards (To do, Doing, Done or any stages), each card with a title, a tag and a person, the count
on each column, cards movable between columns.
- Pick: things moving through stages. Not leads to clients (customers `Pipeline`), not one list of jobs
  (`Checklist`).
- Writes: `columns` of `label` text(14), 2–5; `cards` of `title` text(32), `column` index, `tag` text(12)
  optional, `who` text(16) optional, `goto`, 1–16.
- Parts → actions: cards `root press`, cards `root move` (to a column label). · States: filled, empty.
- Real path: records with a stage field on the device. · Kit: `KitColumns`.
- Aliases: kanban, board, columns, stages.

### `FilterBar` · planned · input · phone
The controls above a table or board: a search box, up to four filter buttons that open a picker, an active
filter count, sort order and a clear action.
- Pick: narrowing many records by several fields. Not a few one-word filters (`Chips`), not switching views
  (`Segmented`).
- Writes: `hint` text(40), `filters` of `label` text(14), `value` text(16) optional, 1–4; `sort` text(20)
  optional.
- Parts → actions: `field type`, filters `root press` (opens a `Sheet` picker), `clear press`.
- States: filled. · Real path: a query built on the device. · Aliases: filters, sort, filter bar, refine.

### `LineChart` · planned · data · phone
One to three series over time as lines, with labelled axes, the latest values, and a tap to read a point.
- Pick: how numbers changed over many points. Not up to seven amounts compared (`Bars`), not a small trend
  under a number (`Stats` style `trend`), not a price with ranges (money `PriceChart`).
- Writes: `title` text(32), `unit` text(8) optional, `labels` text(6) each, 4–31; `series` of `label`
  text(16), `values` numbers matching labels, 1–3.
- Parts → actions: points `root select` (reads the value). · States: filled, empty, loading.
- Real path: values aggregated from records on the device. · Aliases: line chart, trend chart, graph, over time.

### `Donut` · planned · data · phone
Shares of a whole as a donut with the total in the middle and a legend with values and percentages.
- Pick: how a whole splits into parts, for a business report. Not the person's own spending (money
  `Spending`), not targets (`Progress`).
- Writes: `title` text(32), `slices` of `label` text(16), `value` number, 2–6; `unit` text(8) optional.
- Parts → actions: slices `root press`. · States: filled, empty, loading.
- Real path: counts or sums grouped on the device. · Aliases: pie, donut, share, breakdown chart.

### `Heatmap` · planned · data · phone
A grid of cells shaded by value: days of the year (contribution style), or hours by weekday (busy times),
with a scale legend.
- Pick: patterns across many days or hours. Not which days have something on (`Calendar`), not habits in a
  week (health `HabitGrid`).
- Writes: `title` text(32), `kind` (`year`, `week_hours`), `values` numbers (365 or 7×24), `unit` text(8).
- States: filled, loading. · Real path: counts per day or hour from records on the device.
- Aliases: heatmap, busy times, contribution graph, activity grid.

### `BulkActions` · planned · action · phone
A bar that appears when rows are selected: the count selected, select all, and two to four actions such as
archive, tag, export or delete (delete with a confirm).
- Pick: doing one thing to many records at once. Not shortcuts (`Actions`), not one main action (`Button`).
- Writes: `selected` number, `items` of icon, label text(14), `danger` boolean, 2–4.
- Parts → actions: items `root press`, `all press`. · States: filled, empty (hidden). · Region: bottom.
- Real path: the action applied to the selected records on the device.
- Aliases: bulk actions, selection bar, batch, multi-select.

### `ActivityLog` · planned · data · people
Who changed what and when: rows with an avatar, a sentence ("Ana marked order #1042 as shipped"), the time
and a link to the record.
- Pick: an audit of changes by several people. Not one client's history (customers `ClientHistory`), not
  shift notes (team `Handover`), not a timeline of plans (`Timeline`).
- Writes: `entries` of `who` text(20), `photo`, `text` text(80), `time` text(12), `goto`, 1–10.
- Parts → actions: items `root press`. · States: filled, empty, loading.
- Real path: a change log kept by a shared app. · Aliases: activity, audit log, changes, history log.

## Archetypes (3)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `admin_list` | All records of one kind | `table`, `cards` | Header, FilterBar, Table \| List, BulkActions |
| `report` | How it is going | `charts`, `patterns` | Header, Segmented, Stats, LineChart, Donut \| Heatmap |
| `board` | Work by stage | `kanban` | Header, FilterBar, Board |

## Worked example: Stockroom

A shop's back office (with `inventory`). `admin_list` shows 20 products in a `Table` sorted by stock, a
`FilterBar` for "low stock" and "supplier", and `BulkActions` to reorder. `report` shows weekly sales as a
`LineChart` and sales by category as a `Donut`, with busy hours as a `Heatmap`. Signature: `bars_grow`.

## Aliases that shadow the core

With `data`: `table` → `Table` (otherwise `List`); `linechart`, `graph` → `LineChart` (otherwise `Stats`
trend); `kanban`, `board` → `Board`; `filters` → `FilterBar` (otherwise `Chips`).

## Tiers

`ActivityLog` needs other people. Everything else runs on the device over its own records.

## Build notes

- Order: `Table`, `FilterBar`, `LineChart`, `Board`, `Donut`, `BulkActions`, `Heatmap`, `ActivityLog`.
- `Table` and `Board` read compactly: a header line and one line per row, cells separated by `·`.
- Charts are drawn by kit bases; the model writes values only, never axes, ticks or colours.

## Open questions

- **Editing cells in place?** Default: no; a row opens its detail screen with `Field`s.

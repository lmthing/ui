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
- A few one-word filters: `Chips`; switching views: `Segmented`; finding by name: `Search`.

## Components (7)

### `Table` · planned · data · phone
Rows and columns for many records: a sticky first column, sortable headers, numbers right-aligned, status
cells as pills, a tick box per row when rows can be selected, and the row count at the foot; scrolls
sideways when wider than the phone.
- Pick: many records compared across several fields. Not a few things to scan (`List`), not one record's
  facts (`KeyValue`), not a league table (sports `Standings`).
- Writes: `columns` of `label` text(14), `kind` (`text`, `number`, `money`, `date`, `status`), 2–6; `rows`
  of `cells` (text(24) for text and status, numbers for number and money, dates for date; one per column),
  `goto` optional, 1–20; `sort` column index optional; `selectable` boolean.
- Parts → actions: `header select` (sort), rows `root press`, rows `pick check` (with `selectable`).
- States: filled, empty, loading. · Real path: a query over records on the device. · Kit: `KitTable`.

### `Board` · planned · data · phone
Columns of cards for stages (To do, Doing, Done; New, Quoted, Won), each card with a title, a tag, a person
and an optional value, a count and value total per column, cards movable between columns.
- Pick: things moving through stages, including leads becoming clients. Not one list of jobs
  (`Checklist`), not a week of shifts (team `Roster`).
- Writes: `columns` of `label` text(14), 2–5; `cards` of `title` text(32), `column` index, `tag` text(12)
  optional, `who` text(16) optional, `value` number optional, `goto`, 1–16. Column totals are computed.
- Parts → actions: cards `root press`, cards `root move` (to a column label). · States: filled, empty.
- Real path: records with a stage field on the device. · Kit: `KitColumns`.

### `FilterBar` · planned · input · phone
The controls above a table or board: a search box, up to four filter buttons each opening its own small
picker, the active filter count, the sort order and a clear action.
- Pick: narrowing many records by several fields. Not a few one-word filters (`Chips`), not switching views
  (`Segmented`).
- Writes: `hint` text(40), `filters` of `label` text(14), `options` text(16) each, 2–8, `value` optional,
  1–4; `sort` text(20) optional. The pickers are drawn by `FilterBar` itself, not a `Sheet`.
- Parts → actions: `field type`, filters `root select` (an option label), `clear press`.
- States: filled. · Real path: a query built on the device.

### `LineChart` · planned · data · phone
One to three series over time as lines with labelled axes and the latest values; tapping reads a point.
- Pick: how numbers changed over many points. Not up to seven amounts compared (`Bars`), not a small trend
  under a number (`Sparkline`), not a holding's price (money `PriceChart`).
- Writes: `title` text(32), `unit` text(8) optional, `labels` text(6) each, 4–31; `series` of `label`
  text(16), `values` numbers matching `labels`, 1–3.
- Parts → actions: points `root select` (reads the value). · States: filled, empty, loading.
- Real path: values aggregated from records on the device.

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
- Writes: `entries` of `who` text(20), `photo`, `text` text(80), `time` text(12), `goto`, 1–6.
- Parts → actions: items `root press`. · States: filled, empty, loading.
- Real path: a change log kept by a shared app.

## Archetypes (3)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `admin_list` | All records of one kind | `table`, `cards` | `table`: Header, FilterBar, Table, BulkActions · `cards`: Header, FilterBar, List |
| `report` | How it is going | `charts`, `patterns` | `charts`: Header, Segmented, Stats, LineChart, Bars[share] · `patterns`: Header, Heatmap, Bars |
| `board` | Work by stage | `kanban` | Header, FilterBar, Board |

## Worked example: Stockroom

A shop's back office (with `inventory`). `admin_list` shows 20 products in a `Table` sorted by stock, a
`FilterBar` for "low stock" and "supplier", and `BulkActions` to reorder the ticked rows. `report` shows
weekly sales as a `LineChart` and sales by category as `Bars[share]`, with busy hours as a `Heatmap`.
Signature: `bars_grow`.

## Tiers

`ActivityLog` needs other people. Everything else runs on the device over its own records.

## Build notes

- Order: `Table`, `FilterBar`, `LineChart`, `Board`, `BulkActions`, `Heatmap`, `ActivityLog`.
- `Table` and `Board` read compactly: a header line and one line per row, cells separated by `·`.
- Charts are drawn by kit bases; the model writes values only, never axes, ticks or colours.

## Open questions

- **Editing cells in place?** Default: no; a row opens its detail screen with `Field`s.

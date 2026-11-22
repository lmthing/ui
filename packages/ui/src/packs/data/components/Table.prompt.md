## Purpose

Compare and sort many records by several fields, and optionally select rows.

## Pick

Compare several records across named columns, sort by a column, or tick rows for a batch. Not a short scannable list (List), one record's facts (KeyValue), or league standings (Standings).

## Writer

- If asked to hide or omit the row count or footer, set "detail":"brief". Otherwise set detail to null.
- Each row has exactly one cell per column, in the same order. For example, text, number and date columns take cells ["Fern", 4, "2026-11-20"]. text and status take strings up to 24 characters; number and money take numbers; date takes YYYY-MM-DD.
- sort is a zero-based column index; omit it when no sort is requested. selectable enables row checkboxes.
- For grouped rows use group "sections" (first status column, or the first column if there is no status); otherwise use null.
- Set summaryRow to "sum" or "avg" for numeric and money totals or averages, or "count" for a record count. Set exportable true only when an export button is requested.

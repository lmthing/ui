## Purpose

Find missing tax evidence by matching records to one filing period.

## Pick

Completeness of tax evidence for one specified period, computed from linked documents and reviewed receipts. Not manually ticking off jobs (Checklist), money movements (Transactions), client bills (Invoice) or arbitrary data rows (Table).

## Writer

- Write from and to in YYYY-MM-DD, in ascending order. Omit due unless supplied; never infer statutory dates.
- Each requirement asks for "documents" or "receipts" using a tag and a needed count. Do not write matches, totals, tax owed, or filed status.
- Tighter summary rows request density:"compact", retaining all category links. More categories fitting on screen does not request a different surface: write surface:null unless the surface is explicitly requested. Without a spacing request write density:null.
- Exact defaults are density:null, surface:null, detail:null. For explicitly hiding the deadline and receipt totals set only detail:"brief"; keep the category links, requirements and date range.

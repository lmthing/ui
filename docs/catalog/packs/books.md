# `books` pack

**Status:** planned · **Wave:** to be decided · **Pick line:** A small business's own accounts: income,
expenses, profit, tax set aside. Not personal money (`money`), client invoices (`customers`), or selling goods (`commerce`).

## Purpose

Keeping a small business's books: record money received and spent, retain receipts, separate business
costs from owner withdrawals, and understand a period's profit and tax provision. The default is local
cash-basis bookkeeping for one business, not banking, certified accounts or automatic tax filing.

## Apps it serves

Trot's dog-walking accounts, a freelancer's books, a market stall's takings, a small café's accounts,
a tutor's tax year, a maker's business expenses.

## What the core already covers

- One balance, profit or reserve: `Amount`; a few headline figures: `Stats`, supplied by code.
- Expenses by category: `Bars[share]`; up to seven periods compared: `Bars`; a short trend: `Sparkline`.
- Tax already reserved against a computed target: `Progress` with `Amount`. Drop `TaxSetAside`:
  a target, amount and explanatory `Note` are a core recipe; tax calculation belongs to the host.
- Dates and short histories: `Calendar`, `Timeline[history]`; finding and filtering: `Search`, `Chips`.
- Editing ordinary values: `Field`s and `Composer[entry]`; taking a receipt: `Camera[scan]` on core `capture`.
- One receipt photo: `Photo`; business identity: `Profile`; account facts: `KeyValue`; saving: `Button`.

`Ledger` stays for numeric accounting classifications, transfer pairs and source reconciliation, not
a short personal transaction list (money `Transactions`). `Expenses` stays for splitting receipt lines
between categories and VAT codes, not a photo beside a form (inventory `Warranties`). `ProfitLoss` stays
for a reconciled accounting document and taxable-profit bridge, not a few figures or arbitrary data reports.
`VatReturn` maps records to period boxes; `Payroll` computes pay runs, not staff hours (team `Timesheet`).
These packs are neighbours, never dependencies; invoices and sales become source records only when money moves.

## Components (5)

### `Ledger` · planned · data · phone
Dated accounting lines with money in and out, account, category and receipt or payment source. Transfers
and owner movements remain visible but do not inflate income or profit; opening a line shows its source.
- Pick: a business's classified cash ledger with reconciled sources. Not personal spending (money
  `Transactions`), one client's history (customers `ClientHistory`), or arbitrary records (data `Table`).
- Writes: `from`, `to` dates; `entries` of `entryRef` text(32), `date`, `payee` text(32), `accountRef`
  text(32), `categoryRef` text(32), `direction` (`in`, `out`), `net` number > 0, `vatCode` text(32)
  optional, `sourceRef` text(32) optional, `transferRef` text(32) optional, `goto` optional, 1–24; `style`.
  VAT, gross cash, period totals and running balances are computed; no model-written balance.
- Styles: `lines` (default, in/out columns), `accounts` (grouped by account).
- Parts → actions: entries `root press` (linked); `export press`.
  `meta.partTiers: { export: "service" }` for sharing the file outside the app.
- States: filled, empty, loading, error (unresolved source or mismatched transfer).
- Real path: a local ledger over stored receipts and cash records; file export uses the phone's share sheet.
- Density: `meta.dense: true`, weight 3; accounting lines need more than six rows.

### `Expenses` · planned · input · phone
Business expense receipts, each split into category-coded lines with net amounts, business-use fractions
and VAT treatment. A draft can be corrected before posting; voiding a posted receipt retains its audit trail.
- Pick: recording and classifying receipt-backed business costs. Not the whole ledger (`Ledger`),
  ordinary form fields (`Field`), proof of warranty (inventory `Warranties`), or staff approval (team `Approval`).
- Writes: `receipts` of `expenseRef` text(32), `date`, `supplier` text(32), `receipt` photo optional,
  `lines` of `title` text(32), `net` number > 0, `businessUse` number 0–1, `categoryRef` text(32),
  `vatCode` text(32), 1–8; `postedAt` ISO datetime with offset optional, `voided` boolean (default false),
  `goto` optional, 1–6; `captureGoto` optional; `style`. Gross, deductible costs and recoverable VAT are computed.
- Styles: `register` (default, up to six receipt summaries), `receipt` (exactly one receipt, editable draft lines).
- Parts → actions: receipts `root press` (linked), receipts `photo press` (attached photo), receipts
  `void press` (posted only); draft lines `net set`, `businessUse set`, `category select`, `vat select`;
  `post press` (draft receipt only), `capture press` (to `captureGoto`).
  `meta.confirmParts: ["void"]`; `meta.partTiers: { capture: "ok" }`.
- States: filled, empty, loading, success (posted or voided), error (invalid split or save failed).
- Real path: local receipt records; core `Camera` captures evidence with consent, never silently posts OCR guesses.
- Density: `meta.dense: true`, weight 3; one receipt may contain eight classified accounting lines.

### `ProfitLoss` · planned · data · phone
A period report with income and cost sections, category subtotals, profit or loss, and a bridge from
bookkeeping profit to taxable profit. Each category opens the underlying lines; comparisons use another period.
- Pick: reconcile business income, costs and taxable profit for a period. Not a headline (`Amount`),
  independent summary figures (`Stats`), an unstructured report (data `LineChart`), or VAT boxes (`VatReturn`).
- Writes: `from`, `to` dates; `compareFrom`, `compareTo` dates optional (both together); `ledgerGoto`
  optional; `style`. All section values, profit, allowable-cost adjustments and changes come from records.
- Styles: `statement` (default, income and costs), `tax_bridge` (adds disallowed costs and taxable profit).
- Parts → actions: categories `root press` (with `ledgerGoto`, filtered to that category and period).
- States: filled, empty, loading, error (missing classification or unsupported accounting rule).
- Real path: the host aggregates the full local ledger under the brief's accounting and deductibility rules.
- Density: `meta.dense: true`, weight 3; up to 12 category rows plus computed reconciliation lines.

### `VatReturn` · planned · data · phone
One VAT period as numbered boxes, with output tax, recoverable input tax and the amount payable or
refundable. A reconciliation view traces each box to source lines; saving retains a reviewed local snapshot.
- Pick: map business records to a VAT period's prescribed boxes. Not personal tax savings (`Amount`
  with `Progress`), a client's invoice tax (customers `Invoice`), or profit (`ProfitLoss`).
- Writes: `from`, `to` dates, `schemeRef` text(32), `ledgerGoto` optional; `style`.
  Box labels come from the selected rule; every box, VAT figure and payable/refundable result is computed.
- Styles: `boxes` (default, nine-box domestic preview), `reconcile` (each box's source categories and exclusions).
- Parts → actions: boxes `root press` (with `ledgerGoto`, to contributing lines), `save press` (local snapshot only).
- States: filled, empty, loading, success (snapshot saved), error (unsupported scheme or unreconciled records).
- Real path: local arithmetic using a versioned VAT rule supplied in the brief; saving never files or pays a return.
- Density: `meta.dense: true`, weight 3; nine numbered boxes form a document, not a six-fact `KeyValue`.

### `Payroll` · planned · data · phone
A pay run: people, hours and rates or period salaries, adjustments, computed deductions, net pay and
employer costs. Finalising freezes the calculation; recording an actual payment is separate from sending a payslip.
- Pick: calculate and retain a small business's pay run. Not collecting hours (team `Timesheet`),
  clocking in (team `TimeClock`), project time (projects `TimeLog`), or a people directory (`People`).
- Writes: `runRef` text(32), `from`, `to` dates, `payDate` date; `payees` of `employeeRef` text(32),
  `name` text(24), `basis` (`hourly`, `salary`), `rate` number ≥ 0, `hours` number 0–744 (hourly only),
  `adjustments` of `label` text(20), `amount` signed number, 0–3, `ruleRef` text(32),
  `paidAt` ISO datetime with offset optional, 1–6; `finalizedAt` ISO datetime with offset optional,
  `voided` boolean (default false); `style`. Salary `rate` is the stored salary for this period, not an hourly rate.
- Styles: `run` (default, people and totals), `payslip` (one payee selected by the host, calculation breakdown).
- Parts → actions: payees `root press` (open payslip), payees `record press` (actual net payment, finalised only),
  payees `send press` (finalised only), `finalize press`, `void press` (unpaid run only).
  `meta.confirmParts: ["finalize", "void"]`; `meta.partTiers: { send: "service" }`.
- States: filled, empty, loading, success (finalised or payment recorded), error (invalid rule or save failed).
- Real path: local pay records and rule-driven calculations; payslip sending needs a messaging service, not a bank.
- Density: `meta.dense: true`, weight 3; pay lines, deductions and employer-cost reconciliation form one document.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `books_home` | Business cash and recent entries | `books_overview`, `books_ledger` | `books_overview`: Header, Amount[large], Actions, Ledger · `books_ledger`: Header, Search, Chips, Ledger, Button |
| `expenses` | Receipts and classification | `books_receipts`, `books_receipt_edit` | `books_receipts`: Header, Search, Chips, Expenses[register], Button · `books_receipt_edit`: Header[back], Expenses[receipt], Note, Button |
| `period_report` | Close a period or run payroll | `books_statement`, `books_pay_run` | `books_statement`: Header, Segmented, ProfitLoss, Bars, Note, Button · `books_pay_run`: Header, Payroll, Note, Button |
| `tax` | Tax provision and VAT preview | `books_tax_reserve`, `books_vat_period` | `books_tax_reserve`: Header, Amount[large], Progress, Note, Button · `books_vat_period`: Header, VatReturn, Note, Button |

The first listed layout is each `defaultLayout`; all layout ids are pack-prefixed and unique.
Recipes use only core plus `books`, at most one dense component, and stay within plan 4.5's weight limit.
Receipt capture uses core `capture`, not a fifth pack archetype.
Tax reserve omits `Progress` when the computed target is zero, rather than supplying an invalid zero `of`.

## Worked example: Trot (business books)

A dog walker records six cash receipts of 100 and business expenses of 100 for travel and 50 for equipment,
all non-VAT. `books_home` shows the ledger; `expenses` keeps the evidence. `period_report` computes income
600, costs 150 and profit 450. The brief allows both costs and sets a 20% provision with no allowance:
`tax/books_tax_reserve` computes a target of 90; two stored reserve movements of 40 and 20 give 60 reserved
and 30 still to set aside. Reserve transfers never reduce profit. `period_report/books_statement` shows
category costs with core `Bars`; its `bars_grow` is the app's only signature.

A second take is a café's domestic VAT preview: net sales 150 and net purchases 30, both at 20%, fully
recoverable. Code fills boxes 1–9 with 30, 0, 30, 6, 24, 150, 30, 0, 0. One hourly payee works 10 hours
at 12; explicit sample deduction and employer rates of 10% and 5% compute gross 120, deductions 12,
net pay 108 and employer cost 6. These are demonstration rules, not statutory tax or payroll advice.

## Tiers

All main uses work on the owner's phone. Receipt capture is `ok` (`!needs-ok`); exporting ledger files
and sending payslips are `service` parts (`!needs-service`). Staff viewing their own payslips needs
a shared `people` screen; a payee name alone does not. No bank link, payment or filing is implied.

## Build notes

- Order: `Ledger`, `Expenses`, `ProfitLoss`, `VatReturn`, `Payroll`; all remain planned. Build two domain
  examples and choose/write/read probes per component, pack positives and near misses, then `example.jsonl`
  validating and rendering in three presets. Use kit bases, shared copy and `moneyLine`; no new signature.
- Strict `writerFormat(registry)` allows only core plus selected packs. References are host-issued
  snake_case ids, narrowed to the brief's allowed records/rules; repeated seeds must agree. One canonical
  ledger backs every view even without sibling components; posted receipt lines resolve to it exactly once.
- The brief sets one currency, time zone, opening account balances, up to 12 categories classified as
  income, expense, capital, drawings or transfer, and versioned VAT, deductibility and payroll rules.
  Money is numeric; code rounds in minor units under the rule, never adds model-written formatted totals.
- Periods are inclusive, ordered dates spanning at most 366 days; receipt `date` is the cash-payment date.
  Income refunds subtract income; expense refunds subtract costs. Capital, drawings and transfers affect cash, not profit.
  Transfers have two opposite equal-gross legs on different accounts with one `transferRef` and no VAT.
- Receipt VAT is net × the brief's rate; recovery is VAT × business use × the rule's allowed fraction.
  Business cost is (net + VAT) × business use − recovered VAT; personal portions become drawings.
  Disallowed business costs are added back for taxable profit. Voids reverse postings without deleting evidence.
- Gross pay is rate × hours (or period salary) plus adjustments; code computes deductions, net pay,
  employer costs and totals. Reject negative gross or deductions exceeding it. Finalisation freezes the
  rule version; only actual cash payments/remittances enter the ledger, never finalisation or payslip sending.
- Tax provision is computed from taxable profit with the brief's allowance and marginal bands; a flat
  percentage is one band, applied above zero taxable income. Reserve coverage counts tagged net inflows
  into the reserve account for the tax year once per transfer pair, not expenses. Reject missing rules.
- VAT defaults to a domestic standard cash scheme: box 1 output, 2 zero, 3 sum, 4 recoverable input,
  5 difference, 6 net sales, 7 net purchases, 8–9 zero. Exports, acquisitions or other schemes show error.
- Totals use full records before display slicing; dense seeds obey their stated limits, other lists cap
  at six with shared "and N more" copy. Reads include dates, source links, computed values and enabled actions.
  Test refunds, partial business use, voids, duplicate sources, transfers, rounding, tax-band edges,
  negative profit, VAT refunds and repeated payroll finalise/payment actions; snapshots never silently change.

## Open questions

- **New actions?** None. Post, void, capture, export, send, save, finalize and record are part names using
  `press`; receipt values use `set`, classifications `select`. No filing or payment action is proposed.
- **Jurisdictions and legal compliance?** Default: explicitly configured local previews only. Missing
  rules block calculation; official returns, statutory payroll, pensions and filing integrations wait for misses.
- **Accruals, bank feeds or multiple currencies?** Default: local cash records in one currency.
  Unpaid invoices, depreciation, inventory valuation and automatic bank matching are not this first pack.
- **Wave and combinations?** Wave to be decided; optional combinations are report index proposals only.

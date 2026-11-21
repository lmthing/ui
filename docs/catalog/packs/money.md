# `money` pack

**Status:** revised · **Wave:** 2 · **Pick line:** The person's own money: balances, budgets, bills,
splitting costs, debts and repayment plans. Not a business's sales (`commerce`).

## Purpose

Personal and household money: what is in each account, where it went, what is due, who owes whom, how to
clear debts, and how a holding is doing. It never moves money in a first showcase; bank links and payments
are `service`, and "what's real?" says so.

## Apps it serves

Monthly budget, shared flat expenses, trip cost splitter (with `trips`), bill reminders, subscription
tracker, savings jars, kids' pocket money (with `home`), simple portfolio watcher, side-hustle income log,
credit-card payoff, car-loan tracker, mortgage overview, paying back a friend over several months.

## What the core already covers

- One balance or total as the headline: `Amount` style `large`; a few figures (income, spent, left):
  `Stats`.
- Budget per category against its limit: `Progress` (`over: bad`); a savings goal: `Ring` with `Amount`.
- Spending by category: `Bars` style `share`; spending by day or week: `Bars`; one latest value with a
  short trend: `Sparkline`.
- A bill's due date: `Calendar`; repeating bills: `Field` kind `repeat`.
- One amount owed needs only `Amount`; repayment progress from stored payments is `Progress`, and a
  short history of the outstanding amount is `Sparkline`. Terms entered by hand use core `Field`s;
  a forecast's instalments, interest and debt priority need `Loan` or `Payoff`, not another chart id.

The first plan's `Balance` is core `Amount`, its `Budget` is `Progress` under an `Amount`, and the revised
plan's `Spending` donut became core `Bars` style `share`, so money and data share one drawing.

## Components (11)

### `AccountCard` · planned · content · phone

The person's accounts drawn as cards in a sideways row: name, kind (current, savings, card, cash, jar), the
last four digits, the balance, and a colour per account.

- Pick: the person's accounts or cards at a glance. Not one total for everything (`Amount`), not a client's
  payment (customers `PaymentStatus`).
- Writes: `accounts` of `name` text(20), `kind` (`current`, `savings`, `card`, `cash`, `jar`), `last4`
  text(4) optional, `balance` number, `swatch` (from the `swatch` vocabulary), `goto`, 1–4.
- Parts → actions: items `root press`. · States: filled, loading.
- Real path: balances typed in by the person; a bank link would be a `service`.

### `Transactions` · planned · data · phone

Money in and out grouped by day ("Today", "Yesterday", "Mon 3 Nov"): a category icon, the payee, the
category and the signed amount, income in `good`.

- Pick: where money went, entry by entry. Not a client's history (customers `ClientHistory`), not a summary
  by category (`Bars` style `share`).
- Writes: `entries` of `date`, `payee` text(28), `category` text(16), `icon`, `amount` number (signed),
  `goto`, 1–6.
- Parts → actions: items `root press`. · States: filled, empty, loading.
- Real path: entries added by the person or imported from a bank file on the device.

### `Bills` · planned · data · phone

What is due: bills or subscriptions with the payee's icon, the amount, the due date or "every month", a paid
tick, and the month's total at the foot.

- Pick: recurring or upcoming payments to keep on top of. Not a business invoicing a client (customers
  `Invoice`), not past spending (`Transactions`), not a debt's interest and repayment schedule (`Loan`).
- Writes: `bills` of `name` text(24), `amount` number, `due` date optional, `repeat` (`never`, `weekly`,
  `monthly`, `yearly`), `paid` boolean, `icon`, 1–6; `style`. Totals and "overdue" are computed by code.
- Styles: `due` (default: by due date, overdue in `bad`), `subscriptions` (by cost, with the yearly total).
- Parts → actions: items `paid check`, items `root press`. · States: filled, empty.
- Real path: bills typed in by the person; reminders before a due date need notifications (`ok`).

### `Split` · planned · data · people

Shared costs among a group: each person's balance (owed or owing) and the fewest payments to settle up
("Sam pays Ana €24"), with the expenses under it.

- Pick: who owes whom in a group. Not one person's bills (`Bills`), not a business's unpaid clients
  (customers `PaymentStatus`), not paying a fixed debt back over months (`Loan`, `Payoff`).
- Writes: `people` of `name` text(20), `photo`, 2–6; `expenses` of `title` text(28), `amount`, `by` index,
  `split` (`equal`, `shares`), 0–6; `goto` (the add-expense screen). Balances and settle-ups are computed.
- Parts → actions: `add press` (goes to `goto`), settle-up items `settle press` (`partTiers`: `people`).
- States: filled, empty, success (settled). · Real path: shared expenses in a shared app.

### `AmountPad` · planned · input · phone

A large amount at the top that fills as digits are typed on a big keypad below, with a backspace and an
optional note line.

- Pick: entering an amount of money quickly as the main thing on the screen. Not a number in a form
  (`Field` kind `number`), not a count (`Counter`).
- Writes: `label` text(24), `value` number optional, `max` number optional, `note` boolean.
- Parts → actions: `pad type` (digits), `note type`. · States: filled, empty.
- Real path: an amount saved to a new entry on the device.

### `PriceChart` · planned · data · service

A holding's price over time as a line, with the current price and change above it and range tabs (1D, 1W,
1M, 1Y, All) below.

- Pick: how one holding's price moved. Not a personal measurement (health `Measurements`), not a business
  metric (data `LineChart`), not one sum (`Amount`).
- Writes: `name` text(24), `points` 8–60, `range` (`day`, `week`, `month`, `year`, `all`). The current price
  and change are the last point and its difference from the first.
- Parts → actions: `range select`. · States: filled, loading.
- Real path: prices from a market data service.

### `Loan` · planned · data · phone

One debt's remaining principal, annual rate and monthly payment, with the next payment's principal and
interest split and a projected finish date. The schedule shows the balance falling after each
instalment; an interest-free loan to a friend uses the same calculation with a zero rate.

- Pick: one debt's terms and computed repayment schedule. Not one amount owed (`Amount`), a payment
  reminder (`Bills`), borrowed belongings (inventory `Loans`), or prioritising several debts (`Payoff`).
- Writes: `name` text(24), `principal` number > 0 (the opening principal), `rate` 0–100 (nominal annual
  percent), `payment` number > 0 (planned monthly amount), `firstDue` date; `payments` of `due` date
  and `amount` number > 0, 0–6 (recorded payments against monthly due dates); `goto` optional; `style`.
  No currency, current balance, interest totals, schedule rows or finish date are model-written.
- Styles: `summary` (default: terms, remaining principal and next instalment), `schedule` (the same
  summary with up to 6 upcoming instalments and their principal, interest and remaining amounts).
- Parts → actions: `edit press` (when `goto` links to the terms/payment-record form).
- States: filled, loading, success (cleared), error (payment does not cover interest).
- Real path: opening terms and payment records saved on the device; code accrues monthly interest and
  computes the balance and forecast. This is an estimate, not a lender statement or a money transfer.

### `Payoff` · planned · data · phone

A plan to clear one or more debts: total still owed, the monthly budget, repayment order and the estimated
debt-free date, with a falling balance line. Each debt shows its projected clearance month; changing the
priority or extra monthly amount recomputes the whole plan.

- Pick: allocating a monthly budget to clear debts over time. Not one debt's instalment breakdown
  (`Loan`), a static repayment target (`Progress`), a recent balance trend (`Sparkline`), or group
  settle-ups (`Split`).
- Writes: `debts` of the `Loan` source fields (`name`, `principal`, `rate`, `payment`, `firstDue`,
  `payments`, with the same limits), 1–6; `extra` number ≥ 0 (additional monthly repayment, default 0);
  `strategy` (`high_rate` default, `small_balance`); `goto` optional; `style`. Code computes the monthly
  budget from regular payments plus `extra`, every balance, allocation, order, date and chart point.
- Styles: `plan` (default: headline, falling balance and debt-order rows), `compact` (headline and
  debt-order rows without the line). Strategy changes the calculation, not the visual style.
- Parts → actions: `strategy select`, `extra set` (a nonnegative amount), `edit press` (when linked).
- States: filled, empty (no debts), loading, success (all cleared), error (budget cannot reduce debt).
- Real path: a local projection, never a payment; shared acknowledgement of a friend's loan is a host `people` feature.

### `CardControls` · planned · input · service
Controls for a single debit, credit, or EBT card: a lock/freeze toggle, independent channel switches for online, ATM, and international or out-of-state spending, a per-transaction spend-cap slider, and masked card digits with CVV reveal. Toggling card freeze asks for confirmation before locking the card; masked digits and CVV stay read-protected as secrets until explicitly unlocked.
- Pick: configuring security locks, spending channels, and caps for one payment card. Not listing accounts or balances (`AccountCard`), paying bills (`Bills`), or ordinary app settings (`List`).
- Writes: `cardRef` text(32), `label` text(24), `network` (`debit`, `credit`, `ebt`, `prepaid`), `last4` text(4), `frozen` boolean (default false), `channels` (`online` boolean, `atm` boolean, `international` boolean), `spendCap` number ≥ 0 optional, `maxCap` number > 0 optional (upper slider bound when `spendCap` is supplied), `maskedNumber` secret(24) optional, `cvv` secret(4) optional, `expires` text(7) optional, `style`. Formatted cap amounts and masked card values are rendered by code.
- Styles: `controls` (default, card header, lock toggle, channel switches, and spend-cap slider), `compact` (lock toggle and channel switches without slider or secret reveal).
- Parts → actions: `freeze toggle`, `online toggle`, `atm toggle`, `international toggle`, `spendCap set` (number up to `maxCap`), `reveal press` (host unlock gate before revealing masked card number or CVV). `meta.confirmParts: ["freeze"]`.
- States: filled, loading, success (rule updated), error (card issuer sync failed).
- Real path: card lock state and channel limits synced with the issuing bank or card-program service; secret reveal uses a host device-unlock check (`ok`).

### `MoneyTransfer` · planned · action · service
A peer-to-peer send or request money flow: recipient row, funding source selector, large amount entry, optional memo, transfer speed and fee breakdown, and a tab to share or scan a personal payment QR code. Switching between send and request updates the confirmation copy; committing a transfer requires confirmation.
- Pick: sending or requesting money between two people or accounts. Not entering a local expense amount (`AmountPad`), settling shared group costs (`Split`), or paying a business invoice (customers `PaymentStatus`).
- Writes: `mode` (`send` default, `request`), `recipient` (`name` text(24), `handle` text(32) optional, `photo` optional), `sources` of `label` text(24), `last4` text(4) optional, `balance` number optional, 1–4; `sourceAt` index (default 0), `amount` number > 0 optional, `memo` text(60) optional, `speed` (`standard` default, `instant`), `instantFee` number ≥ 0 optional, `qrPayload` text(120) optional, `style`. Total including any instant fee and directional labels are computed by code.
- Styles: `transfer` (default, recipient, source selector, amount keypad, speed, and memo), `qr` (personal payment QR code with scan-to-pay action).
- Parts → actions: `mode select` (`send` or `request`), `source select`, `pad type` (digits), `memo type`, `speed select` (`standard` or `instant`), `submit press`, `scan scan` (scans a recipient QR code). `meta.confirmParts: ["submit"]`.
- States: filled, empty (amount not entered), loading, success (transfer sent or requested), error (insufficient balance or network error).
- Real path: executed by a payment rails or P2P network service; QR scanning uses camera permission (`ok`) and requests involve the recipient (`people`).

### `CreditScore` · planned · data · service
A consumer credit score summary displaying the numeric score on a 300–850 band gauge with its rating tier, signed score delta since the previous report, bureau and update date label, and four to six rated factor rows covering payment history, utilization percent, credit age, recent inquiries, and credit mix. Tapping a factor opens its breakdown when linked.
- Pick: displaying a consumer credit score and its contributing rating factors. Not a personal savings goal (`Ring`), body vitals (health `Vitals`), or category budgets (`Progress`).
- Writes: `score` integer 300–850, `previousScore` integer 300–850 optional, `bureau` text(24), `updatedAt` date, `factors` of `label` text(24), `value` text(16), `rating` (`excellent`, `good`, `fair`, `poor`), `impact` (`high`, `medium`, `low`), `goto` optional, 4–6; `style`. Band tier label and signed score delta are computed by code from `score` and `previousScore`.
- Styles: `gauge` (default, 300–850 multi-zone band gauge above factor rows), `compact` (headline score, delta, and factor rows without the band gauge).
- Parts → actions: factors `root press` (when linked via `goto`), `refresh press`.
- States: filled, empty (no bureau score available), loading, error (bureau service unreachable).
- Real path: score and factor ratings fetched from a credit-bureau monitoring service on behalf of the user.

## Archetypes (6)

| Archetype | Job                             | Layouts                      | Recipe                                                                                                                                   |
| --------- | ------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `wallet`  | My money now                    | `accounts`, `goal`           | `accounts`: Header, Amount[large], AccountCard, Transactions · `goal`: Header, Ring, Amount, Transactions                                |
| `budget`  | This month against the plan     | `categories`, `share`        | `categories`: Header, Segmented, Amount, SectionTitle, Progress, SectionTitle, Progress · `share`: Header, Segmented, Bars[share], Bills |
| `entry`   | Log an expense or income        | `quick`                      | Header, AmountPad, Chips, Field[date], Button                                                                                            |
| `split`   | A shared pot                    | `group`                      | Header, Split, Button                                                                                                                    |
| `invest`  | A holding                       | `simple`                     | Header, PriceChart, KeyValue, List                                                                                                       |
| `debt`    | Understand and clear what I owe | `money_loan`, `money_payoff` | `money_loan`: Header[back], Loan[schedule], Note, Button · `money_payoff`: Header, Payoff, Note, Button                                  |

The `categories` layout splits a budget over five categories into two `Progress` blocks under section
titles ("Needs", "Wants"), because two of one id may not touch.

## Worked example: Kitty

A flat's shared expenses. Four flatmates log groceries and bills (`entry`), `Split` shows who owes whom with
two settle-ups, `Bills` holds rent, power and internet with the month's total, and `budget` shows groceries
at 80% of the month's limit. A flatmate's `debt/money_loan` shows a zero-interest loan from a friend;
`debt/money_payoff` compares paying that and a credit card down with an extra monthly amount.
Signature: `count_up` on the balance.

## Tiers

Settling up in `Split` needs the group on a shared app; `PriceChart` needs market data. Bank linking is out
of scope; amounts are typed in or imported.
`Loan` and `Payoff`, including edits and recalculation, are `phone`. Neither has a pay/settle part;
any future lender sync or payment part must be `service` in `meta.partTiers`, not a local success tick.

## Build notes

- Order: `Transactions`, `AmountPad`, `Bills`, `Split`, `AccountCard`, `Loan`, `Payoff`, `PriceChart`; Wave 6 additions follow in order: `CardControls`, `MoneyTransfer`, `CreditScore`.
- Wave 6 option upgrades on existing components: `AccountCard` adds `style: "stacked"` plus optional `creditLimit` and `rewardsValue`; `Transactions` adds optional `status` (`posted`, `pending`, `disputed`), `note` text(60), and `receipt` photo thumbnail; `Bills` adds optional `trialEnds` date and cancel/manage shortcut on `style: "subscriptions"`; `Loan` adds `cadence` (`weekly`, `biweekly`, `monthly`) and `style: "installments"` for Pay-in-4 / 0% APR plans.
- Wave 6 boundaries: generic scannable barcode, loyalty, transit, and membership passes unify in proposed Core `PassCard` rather than a duplicate `WalletPass` in `money`; mobile check deposit uses Core `Camera[document_dual]`. Stock/crypto portfolios stay in `invest`, SMB bookkeeping in `books`, and NFC HCE tap-to-pay emulation in native OS adapters (`Canvas`).
- `CreditScore` reuses `KitRangeBand` with a multi-zone band option rather than adding a new kit base.
- Every sum, share, balance and settle-up is computed by code from items; the model never writes a total.
- Share the pure repayment calculator between `Loan` and `Payoff`; add adjacent unit tests when built.
  At each monthly due date accrue `remaining principal × rate / 1200`, round to the brief currency's minor unit,
  then subtract recorded payments, never below zero. Derive elapsed periods from the host's date;
  clamp a due day to the month's last day. Forecast future payments separately from recorded ones.
- Forecasts assume fixed rates, no new borrowing or fees and monthly payments. Payoff first funds each
  debt's regular payment, then sends extra and unused payments to the chosen priority, rolling the full
  monthly budget forward after a debt clears. Ties use source order; cap the final payment at what is owed.
- Compute the full projection, then display at most 6 schedule/debt rows and 3–12 sampled balance points;
  use shared copy for remaining rows. At 600 months, show no finish date if debt remains; never invent
  one when payments fail to cover interest. Charts and headlines consume the same computed result.
- Add two domain examples per new component (credit card/car loan, mortgage/friend), and positive,
  near-miss, write and read probes against `Amount`, `Progress`, `Sparkline`, `Bills`, `Split` and `Loans`.

## Open questions

- **Several currencies in one app?** Default: one per app (the brief's); a trip `Split` may show a second
  for display only.
- **Credit cards, variable rates and mortgage escrow?** Default: a fixed-rate, principal-and-interest
  estimate, with the monthly payment chosen by the person; minimum-payment formulas, fees, taxes,
  insurance, new charges and rate changes are not inferred. Show this assumption in shared copy.
- **A debt already part-paid?** Default: opening principal plus payments, never a separate current balance.
  The showcase seeds at most 6 records; hosts calculate from the full stored history.
- **A payment cannot clear the debt?** Default: show insufficient payment or the horizon, not a debt-free date.

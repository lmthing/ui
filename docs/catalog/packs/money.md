# `money` pack

**Status:** revised · **Wave:** 2 · **Pick line:** The person's own money: balances, budgets, bills,
splitting costs. Not a business's sales (`commerce`).

## Purpose

Personal and household money: what is in each account, where it went, what is due, who owes whom, and how
savings or investments are doing. It never moves money itself in a first showcase; payments and bank links
are tier `service`, and "what's real?" says so.

## Apps it serves

Monthly budget, shared flat expenses, trip cost splitter (with `trips`), bill reminders, subscription
tracker, savings jars, kids' pocket money (with `home`), simple portfolio watcher, side-hustle income log.

## What the core already covers

- One balance or total as the headline: `Amount` style `large`; a few figures (income, spent, left):
  `Stats`.
- Budget per category against its limit: `Progress` (`over: bad`); a savings goal: `Ring`.
- Spending by day or week: `Bars`; a short trend: `Stats` style `trend`.
- A bill's due date in a calendar: `Calendar`; paying day reminders: `Field` kind `repeat`.

The first plan's `Balance` is now core `Amount`, and its `Budget` is `Progress` under an `Amount`: a second
budget bar would be a near miss with `Progress` on every budget screen.

## Components (7)

### `AccountCard` · planned · content · phone
An account drawn as a card: its name, the last four digits or the kind (cash, savings, card), the balance,
and an accent per account, in a sideways row when there are several.
- Pick: the person's accounts or cards at a glance. Not one total for everything (`Amount`), not a client's
  payment (customers `PaymentStatus`).
- Writes: `accounts` of `name` text(20), `kind` (`current`, `savings`, `card`, `cash`, `jar`), `last4`
  text(4) optional, `balance` number, `currency`, `accent` (accent name), `goto`, 1–4.
- Parts → actions: items `root press`. · States: filled, loading.
- Real path: balances typed in by the person; a bank link would be tier `service`.
- Aliases: accounts, cards, wallet, jars.

### `Transactions` · planned · data · phone
Money in and out grouped by day ("Today", "Yesterday", "Mon 3 Nov"): a category icon, the payee, the
category, and the signed amount, income in `good`.
- Pick: where money went, entry by entry. Not a client's history (customers `ClientHistory`), not a summary
  by category (`Spending`).
- Writes: `entries` of `date`, `payee` text(28), `category` text(16), `icon`, `amount` number (signed),
  `goto`, 1–10; `currency`.
- Parts → actions: items `root press`. · States: filled, empty, loading.
- Real path: entries added by the person or read from a bank export on the device.
- Aliases: transactions, spending, payments, history, statement.

### `Spending` · planned · data · phone
Where the money went this period as a donut with the total in the middle and a legend of categories with
amounts and shares, the largest first.
- Pick: how spending splits across categories. Not spending against limits (`Progress`), not amounts across
  days (`Bars`), not a general chart for a business (data `Donut`).
- Writes: `period` text(20), `slices` of `label` text(16), `amount` number, `icon` optional, 2–6;
  `currency`. The total and shares are computed by code.
- Parts → actions: slices `root press`. · States: filled, empty, loading.
- Real path: transactions summed by category on the device. · Aliases: breakdown, categories, pie, where it went.

### `Bills` · planned · data · phone
What is due: upcoming bills or subscriptions with the payee's icon, the amount, the due date or "every
month", a paid tick, and the total for the month at the foot.
- Pick: recurring or upcoming payments to keep on top of. Not a business invoicing a client (customers
  `Invoice`), not past spending (`Transactions`).
- Writes: `bills` of `name` text(24), `amount` number, `due` date optional, `repeat` (`never`, `weekly`,
  `monthly`, `yearly`), `paid` boolean, `icon`, 1–8; `currency`; `style`.
- Styles: `due` (default: by due date, overdue in `bad`), `subscriptions` (by cost, with the yearly total).
- Parts → actions: items `paid check`, items `root press`. · States: filled, empty.
- Real path: bills typed in by the person; reminders need notifications (`ok`).
- Aliases: bills, subscriptions, recurring, due, direct debits.

### `Split` · planned · data · people
Shared costs among a group: each person with what they paid and their balance (owed or owing), and the
fewest payments to settle up ("Sam pays Ana €24").
- Pick: who owes whom in a group. Not one person's bills (`Bills`), not a business's unpaid clients
  (customers `PaymentStatus`).
- Writes: `people` of `name` text(20), `photo`, `paid` number, 2–8; `expenses` of `title` text(28),
  `amount`, `by` index, `split` (`equal`, `shares`), 0–8; `currency`. Balances and settle-ups are computed
  by code.
- Parts → actions: `add press`, settle-up items `settle press` (`!needs-people`).
- States: filled, empty, success (settled). · Real path: shared expenses in a shared app.
- Aliases: split, split bill, shared expenses, iou, settle up.

### `AmountPad` · planned · input · phone
A large amount at the top that fills as digits are typed on a big keypad below, with the currency, a
backspace, and an optional note line.
- Pick: entering an amount of money quickly, as the main thing on the screen. Not a number in a form
  (`Field` kind `number`), not a count (`Counter`).
- Writes: `label` text(24), `value` number optional, `currency`, `max` number optional, `note` boolean.
- Parts → actions: `pad type` (digits), `note type`. · States: filled, empty.
- Real path: an amount saved to a new entry on the device. · Aliases: keypad, amount entry, number pad, enter amount.

### `PriceChart` · planned · data · service
A price over time as a line with the current price and change above it, and range tabs (1D, 1W, 1M, 1Y,
All) below.
- Pick: how one holding's price moved. Not a personal measurement over time (health `Measurements`), not a
  business metric (data `LineChart`).
- Writes: `name` text(24), `price` number, `currency`, `change` number, `points` 8–60, `range` (`day`,
  `week`, `month`, `year`, `all`).
- Parts → actions: `range select`. · States: filled, loading.
- Real path: prices from a market data service. · Aliases: stock chart, price, portfolio chart, ticker.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `wallet` | My money now | `accounts`, `simple` | Header, Amount[large], AccountCard, Transactions |
| `budget` | This month against the plan | `categories`, `donut` | Header, Segmented, Amount, Progress \| Spending, Bills |
| `split` | A shared pot | `group` | Header, People[stack], Split, Button |
| `invest` | Holdings | `simple` | Header, Amount[large], PriceChart, List |

## Worked example: Kitty

A flat's shared expenses. Four flatmates log groceries and bills (`AmountPad`), `Split` shows who owes whom
with two settle-ups, `Bills` holds rent, power and internet with the monthly total, and `budget` shows
groceries at 80% of the month's limit. Signature: `count_up` on the balance.

## Aliases that shadow the core

With `money`: `transactions`, `statement` → `Transactions` (otherwise `List`); `breakdown`, `pie` →
`Spending`; `keypad` → `AmountPad` (otherwise `Field`); `bills` → `Bills` (otherwise `Checklist`).

## Tiers

`Split` needs the group on a shared app; `PriceChart` needs a market data service. Bank linking is out of
scope; amounts are typed in or imported.

## Build notes

- Order: `Transactions`, `AmountPad`, `Bills`, `Spending`, `Split`, `AccountCard`, `PriceChart`.
- Every sum, share and settle-up is computed by code from the items; the model never writes a total.
- Money is formatted by core `moneyLine`, so packs and core agree on symbols and decimals.

## Open questions

- **Multiple currencies in one app?** Default: one per app; `Split` for a trip may take a second for display
  only.

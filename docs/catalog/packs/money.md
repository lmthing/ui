# `money` pack

**Status:** revised · **Wave:** 2 · **Pick line:** The person's own money: balances, budgets, bills,
splitting costs. Not a business's sales (`commerce`).

## Purpose

Personal and household money: what is in each account, where it went, what is due, who owes whom, and how a
holding is doing. It never moves money in a first showcase; bank links and payments are `service`, and
"what's real?" says so.

## Apps it serves

Monthly budget, shared flat expenses, trip cost splitter (with `trips`), bill reminders, subscription
tracker, savings jars, kids' pocket money (with `home`), simple portfolio watcher, side-hustle income log.

## What the core already covers

- One balance or total as the headline: `Amount` style `large`; a few figures (income, spent, left):
  `Stats`.
- Budget per category against its limit: `Progress` (`over: bad`); a savings goal: `Ring` with `Amount`.
- Spending by category: `Bars` style `share`; spending by day or week: `Bars`; a short trend: `Stats` style
  `trend`.
- A bill's due date: `Calendar`; repeating bills: `Field` kind `repeat`.

The first plan's `Balance` is core `Amount`, its `Budget` is `Progress` under an `Amount`, and the revised
plan's `Spending` donut became core `Bars` style `share`, so money and data share one drawing.

## Components (6)

### `AccountCard` · planned · content · phone
The person's accounts drawn as cards in a sideways row: name, kind (current, savings, card, cash, jar), the
last four digits, the balance, and a colour per account.
- Pick: the person's accounts or cards at a glance. Not one total for everything (`Amount`), not a client's
  payment (customers `PaymentStatus`).
- Writes: `accounts` of `name` text(20), `kind` (`current`, `savings`, `card`, `cash`, `jar`), `last4`
  text(4) optional, `balance` number, `swatch` (from the `swatch` vocabulary), `goto`, 1–4.
- Parts → actions: items `root press`. · States: filled, loading.
- Real path: balances typed in by the person; a bank link would be a `service`.
- Aliases: accounts, accountcard, cards, wallet, jars.

### `Transactions` · planned · data · phone
Money in and out grouped by day ("Today", "Yesterday", "Mon 3 Nov"): a category icon, the payee, the
category and the signed amount, income in `good`.
- Pick: where money went, entry by entry. Not a client's history (customers `ClientHistory`), not a summary
  by category (`Bars` style `share`).
- Writes: `entries` of `date`, `payee` text(28), `category` text(16), `icon`, `amount` number (signed),
  `goto`, 1–10.
- Parts → actions: items `root press`. · States: filled, empty, loading.
- Real path: entries added by the person or imported from a bank file on the device.
- Aliases: transactions, payments, moneyin, moneyout.

### `Bills` · planned · data · phone
What is due: bills or subscriptions with the payee's icon, the amount, the due date or "every month", a paid
tick, and the month's total at the foot.
- Pick: recurring or upcoming payments to keep on top of. Not a business invoicing a client (customers
  `Invoice`), not past spending (`Transactions`).
- Writes: `bills` of `name` text(24), `amount` number, `due` date optional, `repeat` (`never`, `weekly`,
  `monthly`, `yearly`), `paid` boolean, `icon`, 1–8; `style`. Totals and "overdue" are computed by code.
- Styles: `due` (default: by due date, overdue in `bad`), `subscriptions` (by cost, with the yearly total).
- Parts → actions: items `paid check`, items `root press`. · States: filled, empty.
- Real path: bills typed in by the person; reminders before a due date need notifications (`ok`).
- Aliases: bills, subscriptions, recurring, directdebits.

### `Split` · planned · data · people
Shared costs among a group: each person's balance (owed or owing) and the fewest payments to settle up
("Sam pays Ana €24"), with the expenses under it.
- Pick: who owes whom in a group. Not one person's bills (`Bills`), not a business's unpaid clients
  (customers `PaymentStatus`).
- Writes: `people` of `name` text(20), `photo`, 2–8; `expenses` of `title` text(28), `amount`, `by` index,
  `split` (`equal`, `shares`), 0–8; `goto` (the add-expense screen). Balances and settle-ups are computed.
- Parts → actions: `add press` (goes to `goto`), settle-up items `settle press` (`partTiers`: `people`).
- States: filled, empty, success (settled). · Real path: shared expenses in a shared app.
- Aliases: split, splitbill, sharedexpenses, iou, settleup.

### `AmountPad` · planned · input · phone
A large amount at the top that fills as digits are typed on a big keypad below, with a backspace and an
optional note line.
- Pick: entering an amount of money quickly as the main thing on the screen. Not a number in a form
  (`Field` kind `number`), not a count (`Counter`).
- Writes: `label` text(24), `value` number optional, `max` number optional, `note` boolean.
- Parts → actions: `pad type` (digits), `note type`. · States: filled, empty.
- Real path: an amount saved to a new entry on the device. · Aliases: keypad, amountpad, numberpad.

### `PriceChart` · planned · data · service
A holding's price over time as a line, with the current price and change above it and range tabs (1D, 1W,
1M, 1Y, All) below.
- Pick: how one holding's price moved. Not a personal measurement (health `Measurements`), not a business
  metric (data `LineChart`), not one sum (`Amount`).
- Writes: `name` text(24), `points` 8–60, `range` (`day`, `week`, `month`, `year`, `all`). The current price
  and change are the last point and its difference from the first.
- Parts → actions: `range select`. · States: filled, loading.
- Real path: prices from a market data service. · Aliases: pricechart, stockchart, ticker, holding.

## Archetypes (5)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `wallet` | My money now | `accounts`, `goal` | `accounts`: Header, Amount[large], AccountCard, Transactions · `goal`: Header, Ring, Amount, Transactions |
| `budget` | This month against the plan | `categories`, `share` | `categories`: Header, Segmented, Amount, SectionTitle, Progress, SectionTitle, Progress · `share`: Header, Segmented, Bars[share], Bills |
| `entry` | Log an expense or income | `quick` | Header, AmountPad, Chips, Field[date], Button |
| `split` | A shared pot | `group` | Header, Split, Button |
| `invest` | A holding | `simple` | Header, PriceChart, KeyValue, List |

The `categories` layout splits a budget over five categories into two `Progress` blocks under section
titles ("Needs", "Wants"), because two of one id may not touch.

## Worked example: Kitty

A flat's shared expenses. Four flatmates log groceries and bills (`entry`), `Split` shows who owes whom with
two settle-ups, `Bills` holds rent, power and internet with the month's total, and `budget` shows groceries
at 80% of the month's limit. Signature: `count_up` on the balance.

## Aliases that shadow the core

With `money`: `transactions` → `Transactions` (otherwise `List`); `keypad` → `AmountPad` (otherwise
`Field`); `bills` → `Bills` (otherwise `Checklist`). No other alias here matches a core alias.

## Tiers

Settling up in `Split` needs the group on a shared app; `PriceChart` needs market data. Bank linking is out
of scope; amounts are typed in or imported.

## Build notes

- Order: `Transactions`, `AmountPad`, `Bills`, `Split`, `AccountCard`, `PriceChart`.
- Every sum, share, balance and settle-up is computed by code from items; the model never writes a total.

## Open questions

- **Several currencies in one app?** Default: one per app (the brief's); a trip `Split` may show a second
  for display only.

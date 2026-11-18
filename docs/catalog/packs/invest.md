# `invest` pack

**Status:** planned · **Wave:** to be decided · **Pick line:** Investments over time: holdings, allocation,
watchlists, performance, dividends, savings goals. Not day-to-day spending and bills (`money`), not a
business's books (`books`, proposed).

## Purpose

Following money set aside for the future: what is owned, how its value changes apart from contributions,
what income it pays, and how close it brings a savings target. It records investments, not advice or
orders to a broker. A first showcase uses local records and dated quotes; live prices need a service.

## Apps it serves

Stock or crypto portfolio, pension tracker, kids' long-term savings, family investment club, dividend
income diary, a household saving toward education or retirement.

## What the core already covers

- Allocation by asset class: `Bars[share]`, with numeric class values computed from holdings and cash.
  Drop `Allocation`: core already computes totals and shares; there is no new allocation drawing.
- A savings target: `Ring` with `Amount`; several targets: `Progress`, with `over: good`.
  Drop `SavingsGoal`: the host sums assigned contributions or valuations against stored targets.
- A balance: `Amount[large]`; a few summary figures: `Stats`; a short latest-value trend: `Sparkline`.
- Instrument identity and facts: `Profile`, `KeyValue`; ordinary saved names: `List`.
- Entering a contribution or trade: core `Field`s, `Choice`, `Button`; recurrence: `Field[repeat]`.

`Holdings` stays for units, cost and valuation together; `Watchlist` for quote thresholds and distance
from them, not saved names alone. `Performance` separates invested value from money added or withdrawn.
`Dividends` relates a distribution to entitled units and received cash. `InvestmentActivity` records
trades that change units and cash, unlike spending rows. None can be a visual option on a core component.
The money pack's `AccountCard`, `Transactions` and quote-only `PriceChart` are neighbours, not dependencies.

## Components (5)

### `Holdings` · planned · data · phone
Positions as rows with instrument, units, unit cost, dated quote, computed value and unrealised gain.
A linked row opens that holding; refreshing quotes never buys or sells it.
- Pick: owned investment positions with units and cost-based values. Not account balances (money
  `AccountCard`), things in storage (inventory `Things`), plain rows (`List`), or unowned ideas (`Watchlist`).
- Writes: `portfolioId` text(24), `asOf` ISO datetime with offset, `positions` of `assetId` text(24),
  `name` text(32), `symbol` text(12), `class` (`equity`, `bond`, `fund`, `crypto`, `other`), `units`
  number ≥ 0, `unitCost` number ≥ 0, `price` number ≥ 0, `quotedAt` ISO datetime with offset,
  `goto` optional, 0–6; `assetId` text(24) optional (filter to one position); `style`.
  Units and unit cost seed the opening statement, not later totals; code folds subsequent activity.
  Zero-unit seeds register instruments for later buys; only currently positive positions draw as rows.
- Styles: `positions` (default), `compact` (units and value, cost detail on opening).
- Parts → actions: items `root press` (linked only), `refresh press` (service attached only).
  `meta.partTiers: { refresh: "service" }`.
- States: filled, empty, loading, error (quote refresh failed; retain last dated quote).
- Real path: an opening statement and later trades on the device; values use stored quotes. Live quote
  refresh needs market data and reads `!needs-service`; missing quotes show unknown, never zero.
- Weight: 2; at most six rows, shared "and N more" copy beyond them.

### `Watchlist` · planned · data · phone
Instruments being watched, each with a dated quote, an optional target price and the computed gap to it.
Targets mark a condition to watch, not a recommendation or a trade.
- Pick: comparing investment quotes with the person's watch thresholds. Not owned positions (`Holdings`),
  saved names alone (`List`), or physical things to buy (inventory `Wishlist`).
- Writes: `items` of `assetId` text(24), `name` text(32), `symbol` text(12), `price` number ≥ 0,
  `quotedAt` ISO datetime with offset, `target` number > 0 optional, `direction` (`at_or_below`,
  `at_or_above`, target-only, default `at_or_below`), `goto` optional, 1–6; `style`.
  Gap and threshold-met status are computed.
- Styles: `quotes` (default), `targets` (target and signed gap beside each quote).
- Parts → actions: items `root press` (linked only), items `remove press`, `refresh press` (service
  attached only). `meta.confirmParts: ["remove"]`; `meta.partTiers: { refresh: "service" }`.
- States: filled, empty, loading, success (removed), error (refresh failed; retain dated quotes).
- Real path: watch records and manually entered quotes on the device; a live feed is an optional service.
  Removing a watch record never removes an owned position or its shared quote history.
- Weight: 2; a simple name-only watchlist uses core `List` instead.

### `Performance` · planned · data · phone
Portfolio value and net money put in as two labelled lines over the same dates, with their latest
difference as money gained or lost. Range selection changes the view, not the contribution baseline.
- Pick: investment value compared with external contributions over time. Not one instrument's market
  price (money `PriceChart`), a generic series (data `LineChart`), or one small trend (`Sparkline`).
- Writes: `portfolioId` text(24), `title` text(32), `samples` of `at` ISO datetime with offset,
  `quotes` of `assetId` text(24), `price` number ≥ 0, 0–12, 2–60; `range` (`all` default, `month`,
  `year`); `style`. Quotes are stored observations, not model-written portfolio values or returns.
- Styles: `compare` (default), `compact` (same two lines with a smaller legend).
- Parts → actions: `range select`, points `root select` (reads date, value, net contributions and gain).
- States: filled, empty (fewer than two complete valuations), loading, error (inconsistent history).
- Real path: code replays the shared opening statement, trades, cash flows and received dividends at
  each sample, then values the units with that sample's quotes; no market service is required.
- Weight: 2; chart points are values, not dense rows. No invented zero for a missing instrument quote.

### `Dividends` · planned · data · phone
Distributions with instrument, entitlement date, payment date, amount per unit, computed gross and net
cash, and whether the person recorded receipt. Expected income never counts as received cash.
- Pick: investment distributions tied to units and actual receipts. Not bills to pay (money `Bills`),
  recurring deposits (`InvestmentActivity`), or ordinary dated events (`Timeline`).
- Writes: `portfolioId` text(24), `distributions` of `id` text(24), `assetId` text(24), `entitledAt`
  ISO datetime with offset, `payOn` date, `perUnit` number > 0, `withheld` number ≥ 0 (default 0),
  `receivedAt` ISO datetime with offset optional, `goto` optional, 1–6; `style`.
  Entitled units, gross, net, totals and expected/received status are computed, never written twice.
- Styles: `upcoming` (default), `received` (received entries newest first).
- Parts → actions: items `root press` (linked only), items `receive press` (not yet received),
  items `void press` (received only; reverses the receipt, retains the distribution).
  `meta.confirmParts: ["void"]`.
- States: filled, empty, loading, success (receipt recorded), error (save failed or unknown entitlement).
- Real path: distributions and receipt timestamps on the device; eligible units come from the ledger
  at `entitledAt`. Recording receipt credits cash once by distribution id; withholding cannot exceed gross.
- Weight: 2; reinvestment is a separate recorded buy, never automatic growth of units.

### `InvestmentActivity` · planned · data · phone
The investment ledger: contributions, withdrawals, buys, sells, fees and linked dividend receipts in
date order. A trade shows units, unit price, fee and computed cash movement; corrections retain history.
- Pick: investment events that reconcile units, cost and cash. Not everyday spending (money
  `Transactions`), a client's payments (customers `ClientHistory`), or an audit (data `ActivityLog`).
- Writes: `portfolioId` text(24), `since` ISO datetime with offset, `openingCash` number ≥ 0,
  `openingContributed` number (signed historical net contributions), `entries` of `id` text(24),
  `at` ISO datetime with offset, `kind` (`deposit`, `withdrawal`, `buy`, `sell`, `fee`),
  `voided` boolean (default false), `goto` optional, 0–20; `goto` optional (entry-form screen); `style`.
  Buys/sells require `assetId` text(24), `units` number > 0, `unitPrice` number ≥ 0, `fee` number ≥ 0
  (default 0), and omit `amount`; other kinds require `amount` number > 0 and omit trade fields.
- Styles: `ledger` (default), `compact` (event and cash movement).
- Parts → actions: entries `root press` (linked only), entries `void press` (active manual entries only),
  `add press` (linked entry form only, quiet action). `meta.confirmParts: ["void"]`.
- States: filled, empty, loading, success (record saved), error (save failed or invalid correction).
- Real path: local records folded after the opening statement. Dividend rows reference `Dividends`
  receipts and are code-owned, never separately seeded or voided here. No action sends a broker order.
- Density: `meta.dense: true`, weight 3; a reconciled investment ledger needs more than six event lines.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `portfolio` | My investments over time | `invest_positions`, `invest_allocation`, `invest_performance` | `invest_positions`: Header, Amount[large], Holdings, Button · `invest_allocation`: Header, Bars[share], Note · `invest_performance`: Header, Performance, Note |
| `holding` | One position and its income | `invest_holding`, `invest_income`, `invest_activity` | `invest_holding`: Header[back], Holdings[compact] (assetId filter), KeyValue, Button · `invest_income`: Header[back], Dividends, Note · `invest_activity`: Header[back], InvestmentActivity, Button |
| `watchlist` | Quotes against watch thresholds | `invest_watch` | Header, Search, Watchlist[targets], Button |
| `goals` | Long-term savings targets | `invest_goal`, `invest_goals`, `invest_contribution` | `invest_goal`: Header, Ring, Amount, Note, Button · `invest_goals`: Header, Progress, Note, Button · `invest_contribution`: Header, Field[number], Field[date], Button |

The first listed layout is each `defaultLayout`. Layout ids use the pack prefix; recipes use only core
and this pack. The host projects numeric totals into core props; Writers never fill formatted totals.

## Worked example: Nest

A parent's education portfolio, not Ledge's plant care or Trot's business takings. Starting empty on
1 January, they deposit 1000 and buy 10 fund units at 80 with no fee: cash is 200. At a quote of 90,
`portfolio/invest_positions` computes holdings of 900, total value 1100 and unrealised gain 100.
`invest_allocation` uses `Bars[share]` for fund 900 and cash 200; the shares are 81.82% and 18.18%.
`Performance` compares 1100 with 1000 put in, not the fund's 12.5% price rise as a portfolio return.
A distribution of 1 per entitled unit with 2 withheld credits 8 only when received; value becomes 1108
and gain 108 at the unchanged quote. `InvestmentActivity` shows the deposit, buy and linked receipt.
`Watchlist[targets]` watches another fund at 55 against an at-or-below target of 50 (10% above target).
`goals/invest_goal` values this portfolio against a target of 5000; it is 22.16% funded. A second target
uses `Progress` on `invest_goals`. Signature: `ring_fill` on the single goal; no new signature.

## Tiers

All five components work on the phone with local records. `Holdings` and `Watchlist` quote refresh are
`service` parts, with `!needs-service` marks and dated offline quotes. A family club sharing records
needs a shared app (`people` on those screens); its first showcase uses sample members, not live trades.
Notifications for thresholds need permission (`ok`) as a host feature; no notification part is proposed.

## Build notes

- Order: `InvestmentActivity`, `Holdings`, `Performance`, `Dividends`, `Watchlist`; all remain planned.
- Writers use strict `writerFormat(registry)` for core plus chosen packs; no aliases or off-pack ids.
  All record ids are unique snake_case values. Asset references resolve in one shared instrument store;
  consistent repeated seeds merge by id, conflicting snapshots or same-time quotes fail validation.
- `since` equals Holdings' opening `asOf`; later events and samples cannot predate it. With no opening
  positions, use an empty host statement. The store exists even when its supplying component is off-screen;
  examples and fallbacks derive it from the cast through shared helpers, with neutral empty-cast placeholders.
- Replay events by timestamp and stable insertion order. Buys subtract units × price + fee from cash;
  sells add units × price − fee. Use weighted-average book cost, not tax-lot accounting. Reject negative
  cash, overselling, future receipt timestamps and corrections that invalidate later events. Samples have
  unique ordered timestamps and one quote per owned asset; missing quotes leave that valuation unknown.
  Buy fees enter book cost; a sale removes cost in proportion to units sold. Unrealised gain is value − cost.
- Net contributions are openingContributed + deposits − withdrawals; trades, fees and dividend receipts
  are not contributions. Value is cash + sum(units × quote); gain is value − net contributions.
  Show money gain, not an annualised, time-weighted or money-weighted return. Filter ranges after replay.
- Freeze dividend entitlement before recording receipt; unknown pre-opening entitlement stays unknown.
  Before entitlement, show the per-unit schedule only. Receipt cannot precede entitlement or payment day.
  Void/re-receive changes cash exactly once each time. Reinvested income is a receipt followed by a buy.
- One brief currency, no currency props; use shared `moneyLine`, date and decimal-safe numeric helpers.
  Round only for display. Core allocation includes cash; a zero total shows empty, not invented percentages.
  Goals store target, portfolio assignment and funding mode (net contributions or current value); code sums
  that mode, never both, and never silently counts one portfolio toward two goals.
- Dense limits bound showcase seeds, not real totals; aggregate complete records before display slicing.
  Render from existing kit bases, tokens and shared copy; share chart styling with core, not another pack's id.
- Build acceptance: two domain examples and probes per component, core/pack near misses, and validated
  `example.jsonl` in three presets. Test fractional units, zero quotes, missing quotes, deposits versus gains,
  withdrawals, fees, voided buys with later sells, repeated receipts and partially funded goals.

## Open questions

- **New actions?** None. Refresh, remove, receive, void and add are part names accepting existing `press`;
  ranges and chart points use `select`. Destructive parts use the shared confirmation path.
- **Price charts and pack boundaries?** Default: leave money `PriceChart` and its `invest` archetype
  unchanged; this pack compares portfolio value with contributions, not one price. A quote-only use can
  choose core `Sparkline`, or load `money` explicitly. Propose narrowing money's pick line in the index.
- **Business books?** `books` is a proposed neighbouring pack, absent here; no recipe depends on it.
- **Advanced returns, currencies and trades?** Default: no return-rate claims, FX conversion, shorts,
  leverage, corporate actions, tax advice, staking or broker execution. Hosts may import consistent records;
  unsupported accounting waits for misses rather than being approximated as ordinary buys.
- **Wave and combinations?** Wave to be decided; optional pack combinations belong in the index report.

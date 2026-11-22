# `perks` pack

**Status:** planned · **Wave:** 6 · **Pick line:** Cashback offerwalls, verified multi-store coupon feeds
and points-to-cashout trackers. Not single store promos (`commerce/Promo`), not consumer restaurant rewards
(`dining/RewardsWallet`).

## Purpose

Multi-merchant cashback offerwalls, community-verified promo code feeds, and points-to-cashout redemption
meters. This is a conditional `P3` pack: single-brand store promos belong in `commerce/Promo`, restaurant
and café loyalty programs belong in `dining/RewardsWallet` plus Core `PassCard`, and simple survey/earn apps
already compose cleanly from Core `List`, `Steps`, `Choice`, `Progress`, and `Card` (reward/duration pill).
Build `perks` only if multi-store coupon aggregators and partner offerwalls generate recurring misses.

## Apps it serves

Cashback and paid-task offerwall app, multi-store verified coupon aggregator, receipt-points and gift-card
cashout tracker.

## What the core already covers

- Simple surveys and paid task flows: `Choice`, `Steps`, `Checklist`, `List`; reward summary figures: `Stats`,
  `Amount`, `Progress`, and `Card` (reward and duration pill).
- Single-store scannable loyalty passes: `PassCard`; one-merchant discount banners: `commerce/Promo` or `Banner`.
- Merchant reviews and tips: `Review`, `Note`; searching stores: `Search`, `Chips`.

`OfferWall` structures multi-milestone install, task, and survey offers with per-step payout credits;
`CouponFeed` tracks multi-merchant verified codes with one-tap `copy`, freshness timestamps, and working/expired
votes; `CashoutGoal` converts points to cash equivalents and guards redemptions against payout threshold tiers.

## Components (3)

### `OfferWall` · planned · content · service
Multi-step partner install, task, or survey milestone cards showing brand icon and name, offer title,
category badge (`survey`, `install`, `cashback`), estimated minutes, total payout reward, 1–5 milestone steps
with per-step reward amounts and completion ticks, and Start or Continue actions. Code computes earned vs
remaining payout and formats amounts with `moneyLine`.
- Pick: displaying multi-step partner offerwall tasks or surveys with per-milestone reward values. Not
  single-store discount cards (`commerce/Promo`), personal to-do lists (`Checklist`), or gig courier offers
  (`dispatch/OfferCard`).
- Writes: `offers` of `offerId` text(24), `partner` text(24), `title` text(32), `kind` (`survey`, `install`,
  `cashback`), `estMinutes` int 1–120 optional, `milestones` of `label` text(28), `reward` number > 0,
  `completed` boolean (default false), 1–5, `started` boolean (default false), `goto` optional, 1–6; `style`.
  Earned payout, remaining payout, and milestone progress % are computed by code.
- Styles: `cards` (default, milestone checklist and reward pill), `compact` (condensed partner rows with total
  reward badge).
- Parts → actions: offers `root press` (opens `goto`), offers `start press`.
- States: filled, empty (no offers available), loading, success (milestone credited), error (tracking link
  unavailable).
- Real path: partner task tracking and milestone webhooks verified by a rewards attribution service; rewards
  credit only on confirmed server callbacks.

### `CouponFeed` · planned · content · phone
Multi-store verified promo code cards displaying merchant name, discount headline (`20% off sitewide`),
promo code badge with one-tap `copy` action, verification timestamp, brief terms/exclusions hint, and
worked/expired community vote counters. Tapping copy places the code on the clipboard; tapping Worked or
Expired toggles the person's verification vote.
- Pick: browsing and copying multi-store verified promo codes with freshness timestamps and vote counts. Not
  one brand's promotional card (`commerce/Promo`), wallet barcodes (`PassCard`), or restaurant loyalty tiers
  (`dining/RewardsWallet`).
- Writes: `coupons` of `couponId` text(24), `store` text(24), `headline` text(36), `code` text(20), `terms`
  text(60) optional, `verifiedAt` ISO datetime with offset, `upVotes` int 0–99999, `downVotes` int 0–99999,
  `myVote` (`none`, `up`, `down`), `storeUrl` (validated HTTPS URL, text(200)) optional, 1–6; `style`.
  Relative verified age and success ratio are computed by code.
- Styles: `feed` (default, merchant cards with copyable code box, terms, and votes), `compact` (tight store
  and code rows).
- Parts → actions: coupons `code copy`, coupons `up toggle`, coupons `down toggle`, coupons `visit press`
  (when `storeUrl` is present). `meta.partTiers: { visit: "service" }`.
- States: filled, empty (no matching store coupons), loading, success (code copied to clipboard), error (feed
  unavailable).
- Real path: cached multi-store promo codes copied locally via device clipboard; merchant links and vote sync
  use an optional rewards service (`service` tier on `visit`).

### `CashoutGoal` · planned · data · service
Points-to-cash conversion meter showing available points, pending points, computed cash equivalent, progress
bar toward the selected redemption threshold, and 1–6 selectable payout tiers (such as `$5 Gift Card`,
`$10 PayPal`, `$25 Visa`) with a confirmed Redeem trigger. Redeem remains disabled until available points
meet or exceed the chosen tier's threshold.
- Pick: converting earned points into cash value and redeeming against payout threshold tiers. Not personal
  savings goals (`Progress[ring]` + `Amount`), stock dividends (`invest/Dividends`), or restaurant points catalogs
  (`dining/RewardsWallet`).
- Writes: `pointsLabel` text(12) (default `"pts"`), `availablePoints` int 0–1000000, `pendingPoints` int
  0–1000000, `pointsPerUnit` int 1–10000, `tiers` of `tierId` text(24), `label` text(24), `pointsNeeded` int
  10–1000000, `selected` boolean (default false), 1–6; `style`. Cash value (`availablePoints / pointsPerUnit`),
  points still needed, and tier unlock status are computed by code using `moneyLine` and the brief's currency.
- Styles: `meter` (default, cash balance display, threshold bar, and selectable payout tiers), `compact`
  (progress bar and quick redeem).
- Parts → actions: tiers `root select`, `redeem press` (enabled only when selected tier is unlocked).
  `meta.confirmParts: ["redeem"]`.
- States: filled, empty (zero points), loading (submitting payout), success (payout requested), error (payout
  rejected or below threshold).
- Real path: server-verified points balance and payout fulfillment on the rewards service; bank/PayPal account
  details stay outside model-written props.

## Archetypes (2)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `perks_deals` | Browse offerwalls and multi-store coupons | `perks_offers`, `perks_coupons` | `perks_offers`: Header, Chips, OfferWall, Note · `perks_coupons`: Header, Search, CouponFeed |
| `perks_cashout` | Track points toward cash redemptions | `perks_redeem` | `perks_redeem`: Header, CashoutGoal, Stats, Note |

Defaults: `perks_deals/perks_offers`, `perks_cashout/perks_redeem`. Layout ids are `perks_`-prefixed and
unique across the catalog. Recipes use only core plus `perks` and stay within weight 12.

## Worked example: MintBack

A multi-store coupon and cashback task app, separate from Ledge and Trot. On `perks_deals/perks_offers`,
`OfferWall` lists three partner offers including a four-step app milestone worth `12.50` total (`2.50` earned,
`10.00` remaining). Switching to `perks_deals/perks_coupons` displays five store promo codes in `CouponFeed`
where tapping `copy` puts `SPRING20` on the clipboard and marks it copied. On `perks_cashout/perks_redeem`,
`CashoutGoal` converts `1,850` available points (`100` pts per currency unit = `18.50`) alongside `400`
pending points, unlocking the `10` and `15` payout tiers while keeping the `25` tier locked (`650` pts
away). Signature: core `count_up` on the redemption `Stats` summary.

## Tiers

`CouponFeed` browsing and clipboard `copy` work offline on the `phone` (opening `visit` links needs a
`service`). `OfferWall` milestone tracking and `CashoutGoal` points/redemptions require a rewards `service`
(`!needs-service`). No payment credentials or ad-tracking tokens are written in model props.

## Build notes

- **Priority: `P3 (conditional priority)`** — Defer implementation unless recurring `Canvas` misses show
  demand for multi-store coupon feeds and partner offerwalls beyond Core (`List`, `Steps`, `Choice`,
  `Progress`, `Card` reward pill, `PassCard`) plus `commerce/Promo` and `dining/RewardsWallet`.
- Order (when built): `CouponFeed`, `OfferWall`, `CashoutGoal`; all remain planned.
- All drawings compose existing kit bases (`KitCard`, `KitContent`, `KitRow`, `KitCheck`, `KitMeter`,
  `KitOption`, `KitTrail`, `KitText`, `KitAction`); no new wave-6 kit base is needed.
- Writers use strict `writerFormat(registry)` for core plus selected packs only; no aliases or off-pack ids.
  Money values are numeric only and formatted with `moneyLine` under the brief's currency; never write
  computed cash equivalents, earned sums, or verified ages.
- Every component is weight 2 and caps lists at 6 items with shared overflow copy; `CashoutGoal.redeem`
  confirms via `meta.confirmParts`.

## Open questions

- **New action names?** None. Offer launch, visit, and redeem use `press`; promo clipboard uses `copy`;
  worked/expired votes use `toggle`; payout tier choice uses `select`.
- **Receipt scanning for cashback?** Default: combine Core `Camera[scan]` or `paperwork/Receipts` at app
  level rather than adding a receipt scanner inside `perks`.
- **Single-brand loyalty cards?** Default: use Core `PassCard` and `dining/RewardsWallet` rather than `perks`.

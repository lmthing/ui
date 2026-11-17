# `customers` pack

**Status:** revised · **Wave:** 1 · **Pick line:** A business keeping track of the people it serves. Not the
person's own friends (`social`).

## Purpose

A small business's memory of its clients: who they are, what they had, what they owe, what they said, and
which ones are coming back. It pairs with `booking` (services) or `commerce` (goods) and is the second pack
Trot needs.

## Apps it serves

Dog walker's client book, hairdresser's client cards, freelancer's invoices, café loyalty card, tutor's
families, personal trainer's clients with waivers, landlord's tenants (with `inventory`), tradesperson's
quotes and leads.

## What the core already covers

- A list of clients: `List` (rows with photo, meta "Last visit 3 May", trail `badge` "Owes €40"); a search
  over them: `Search`.
- One client's details: `Profile` and `KeyValue`; their pets or kids: `People` or `List`.
- Notes about a client: `Composer` style `entry`; a total owed: `Amount`.
- A message to a client: the `Message` surface (tier `service`).

Unlike the first plan, there is no `ClientList`: a client list is a `List`, and a second list component
would be a near miss on every screen.

## Components (8)

### `ClientCard` · planned · content · phone
The head of a client's page: photo, name, how long they have been a client, the next booking or order,
tags (VIP, new, allergic to…), and call, message and directions buttons.
- Pick: one client's summary at the top of their page. Not the identity of anything else (`Profile`), not a
  list of clients (`List`).
- Writes: `name` text(28), `photo`, `since` date optional, `next` text(36) optional, `tags` text(12) each,
  0–3, `phone` boolean, `address` boolean (show the buttons).
- Parts → actions: `call press`, `message press`, `directions press` (each `!needs-service`).
- States: filled, loading. · Real path: a client record on the device; calling uses the phone dialer.
- Aliases: client, customer, contact card, client profile.

### `ClientHistory` · planned · data · phone
Everything this client has had, newest first: visits, orders, payments and notes as one feed with an icon
per kind and an amount where money moved.
- Pick: the history of one client across kinds of event. Not one day's plan (`Timeline` `day`), not the
  person's own bank transactions (money `Transactions`).
- Writes: `entries` of `date`, `kind` (`visit`, `order`, `payment`, `note`, `message`), `title` text(32),
  `amount` number optional, `goto`, 1–8.
- Parts → actions: items `root press`. · States: filled, empty, loading.
- Real path: records linked to one client on the device. · Aliases: client history, activity, visits, log.

### `Invoice` · planned · content · service
A bill or a quote as a document: who from, who to, number and dates, line items with quantity and price, a
subtotal, tax and total, a status, and a send button.
- Pick: asking a client to pay, or quoting before work. Not the person's own bill to pay (money `Bill`),
  not an order receipt in a shop (commerce `OrderSummary`).
- Writes: `number` text(12), `to` text(28), `date`, `due` date optional, `lines` of `item` text(32),
  `qty` number, `price` number, 1–8, `tax` percent optional, `currency`, `status` (`draft`, `sent`,
  `paid`, `overdue`), `note` text(100) optional.
- Styles: `invoice` (default), `quote` (adds accept and decline for the client; no tax status).
- Parts → actions: `send press` (`!needs-service`), `accept press`, `decline press` (quote).
- States: filled, success (sent). · Real path: a document made on the device; sending it needs email or SMS.
- Aliases: bill, quote, estimate, receipt, statement.

### `PaymentStatus` · planned · data · service
Whether a client has paid: a big status (paid, due, overdue, part paid) with the amount, the date, and a
"Mark as paid" or "Remind" action.
- Pick: tracking whether one payment arrived. Not the full document (`Invoice`), not the person's own
  balance (money `Balance`).
- Writes: `amount` number, `currency`, `status` (`paid`, `due`, `overdue`, `partial`), `paid` number
  optional, `date`, `method` text(16) optional.
- Parts → actions: `mark press`, `remind press` (`!needs-service`). · States: filled, success.
- Real path: a payment flag stored on the device; taking card payments needs a payment service.
- Aliases: paid, payment, owed, outstanding.

### `Review` · planned · content · people
What clients said: as a summary (average stars, count and a five-bar breakdown) or as one review (stars,
name, date, text, and the business's reply).
- Pick: ratings and words from clients. Not the person logging their own feeling (`Scale`), not comments in
  a community (social `Comments`).
- Writes (`summary`): `average` 0–5, `count` number, `bars` five numbers. Writes (`item`): `stars` 1–5,
  `name` text(24), `date`, `text` text(240), `reply` text(160) optional.
- Styles: `summary`, `item`. · Parts → actions: `reply press` (item). · States: filled, empty.
- Real path: reviews left by clients in a shared app. · Aliases: reviews, ratings, testimonials, feedback.

### `Pipeline` · planned · data · phone
Leads moving towards becoming clients, as columns (new, contacted, quoted, won) of small cards with a name
and a value, each card movable to another column.
- Pick: people who might become clients and where each one stands. Not tasks among staff (team
  `TaskBoard`), not a general board of anything (data `Board`).
- Writes: `stages` of `label` text(14), 2–5; `leads` of `name` text(24), `stage` index, `value` number
  optional, `meta` text(24) optional, 1–12.
- Parts → actions: items `root press`, items `root move` (to a stage label).
- States: filled, empty. · Real path: lead records with a stage on the device. · Kit: `KitColumns`.
- Aliases: leads, deals, funnel, prospects, crm.

### `Loyalty` · planned · data · phone
A stamp card: ten circles with the earned ones stamped, the reward written under it ("Your 10th coffee is
free"), and the client's count.
- Pick: rewarding repeat clients with a count to a free thing. Not a habit streak (`Streak`), not a points
  goal of one's own (`Ring`).
- Writes: `stamps` number, `of` 4–12, `reward` text(40), `name` text(24) optional.
- Parts → actions: `stamp press` (the business adds one), `redeem press` when full.
- States: filled, success (reward earned). · Real path: a count per client on the device.
- Aliases: stamp card, rewards card, loyalty points, punch card.

### `Agreement` · planned · input · people
Terms the client must accept: a scrollable short text, an "I agree" tick, the typed name and the date it
was signed.
- Pick: a waiver, consent or terms a client signs once. Not a checklist of jobs (`Checklist`), not a long
  article (media `Article`).
- Writes: `title` text(32), `terms` text(600), `signed` boolean, `name` text(28) optional, `date` optional.
- Parts → actions: `agree check`, `name type`. · States: filled, success (signed).
- Real path: a signed copy kept with the client record; the client signs on their own phone in a shared app.
- Aliases: waiver, consent, terms, contract, sign.

## Archetypes (3)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `clients` | All my clients | `list`, `pipeline` | `list`: Header, Search, Chips, List, Button · `pipeline`: Header, Pipeline |
| `client` | One client fully | `overview`, `history` | Header[back], ClientCard, KeyValue, ClientHistory, Button |
| `invoice` | Bill or quote a client | `edit`, `sent` | `edit`: Header, Invoice, Button · `sent`: Success, PaymentStatus, Button |

## Worked example: Trot (client side)

The walker's client list shows each owner with their dogs and anything owed. Opening one shows
`ClientCard`, the dogs as `List` rows, `ClientHistory` of walks and payments, and an `Invoice` for last
month's walks, sent with one press. `Agreement` holds the owner's key-holding consent.

## Aliases that shadow the core

With `customers`: `client`, `customer` → `ClientCard` (otherwise `Profile`); `invoice`, `bill` → `Invoice`
(otherwise `KeyValue`); `reviews`, `ratings` → `Review` (otherwise `Scale` readonly).

## Tiers

`Invoice` and `PaymentStatus` send through a service; `Review` and `Agreement` need clients on the app. A first showcase uses the business's own view.

## Build notes

- Order: `ClientCard`, `ClientHistory`, `Invoice`, `PaymentStatus` (Trot), then `Review`, `Loyalty`,
  `Agreement`, `Pipeline` (needs `KitColumns`, built with data `Board`).
- `Invoice` computes subtotal, tax and total in code from `lines`; the model never writes a total.

## Open questions

- **Several businesses' clients in one app?** Default: no; one business per app.

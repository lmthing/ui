# `customers` pack

**Status:** revised · **Wave:** 1 · **Pick line:** A business keeping track of the people it serves. Not the
person's own friends (`social`).

## Purpose

A small business's memory of its clients: who they are, what they had, what they owe, what they said, what
they signed and which ones keep coming back. It pairs with `booking` (services) or `commerce` (goods) and is
the second pack Trot needs.

## Apps it serves

Dog walker's client book, hairdresser's client cards, freelancer's invoices, café loyalty card, tutor's
families, personal trainer's clients with waivers, landlord's tenants (with `inventory`), tradesperson's
quotes.

## What the core already covers

- A list of clients: `List` (rows with photo, meta "Last visit 3 May", trail `badge` "Owes €40"); a search
  over them: `Search`.
- One client's details: `KeyValue`; their pets or kids: `List`; notes: `Composer` style `entry`.
- What a client owes in total: `Amount`; a message to a client: the `Message` surface (tier `service`).

The first plan's `ClientList` is dropped (a client list is a `List`), and `Pipeline` is dropped as a near
miss with data `Board`: a business that tracks leads by stage loads `data`. In Wave 6, `Review` is
proposed for **Core promotion** (with optional `photos`, `fitScale`, `spoiler` and `verified` props)
so `commerce`, `places`, `media`, `stays` and `booking` can share it directly.

## Components (9)

### `ClientCard` · planned · content · phone
The head of a client's page: photo, name, how long they have been a client, the next booking or order,
up to three tags (VIP, new, allergic to…), and call, message and directions buttons.
- Pick: one client's summary at the top of their page. Not the identity of anything else (`Profile`), not a
  list of clients (`List`).
- Writes: `name` text(28), `photo`, `since` date optional, `next` text(36) optional, `tags` text(12) each,
  0–3, `phone` boolean, `address` boolean (show those buttons).
- Parts → actions: `call press`, `message press`, `directions press`; all three in `partTiers` as
  `service`. · States: filled, loading.
- Real path: a client record on the device; calling and messaging use the phone's own apps.
- Wave 6 options: add optional `company` text(28), computed `balance` badge, and `email press` (`meta.partTiers: { email: "service" }`).

### `ClientHistory` · planned · data · phone
Everything this client has had, newest first: visits, orders, payments and notes as one feed with an icon
per kind and an amount where money moved.
- Pick: the history of one client across kinds of event. Not a plan in time order (`Timeline`), not the
  person's own bank transactions (money `Transactions`), not changes by staff (data `ActivityLog`).
- Writes: `entries` of `date`, `kind` (`visit`, `order`, `payment`, `note`, `message`), `title` text(32),
  `amount` number optional, `goto`, 1–6.
- Parts → actions: items `root press`. · States: filled, empty, loading.
- Real path: records linked to one client on the device.

### `Invoice` · planned · content · phone
A bill or a quote as a document: who from, who to, number and dates, line items with quantity and price,
subtotal, tax and total, status, and a send button.
- Pick: asking a client to pay, or quoting before work. Not the person's own bills to pay (money `Bills`),
  not a shop order (commerce `OrderSummary`).
- Writes: `number` text(12), `to` text(28), `date`, `due` date optional, `lines` of `item` text(32), `qty`
  number, `price` number, 1–8, `tax` percent optional, `status` (`draft`, `sent`, `paid`), `note` text(100)
  optional, `style`. Subtotal, tax, total and "overdue" (from `due`) are computed by code.
- Styles: `invoice` (default), `quote` (adds accept and decline for the client; no paid status), `estimate` (Wave 6: pre-work estimate without invoice number lock).
- Parts → actions: `send press` (`partTiers`: `service`), `accept press`, `decline press` (in
  `confirmParts`). · States: filled, success (sent).
- Real path: a document made on the device; sending it needs email or SMS.
- Wave 6 options: add optional `discount`, `deposit`, `recurring` (`none`, `weekly`, `monthly`, `quarterly`), and `download press` (`meta.partTiers: { download: "service" }`).

### `PaymentStatus` · planned · data · phone
Whether one payment arrived: a big status (paid, due, overdue, part paid) with the amount, the date, the
method, and "Mark as paid" or "Remind".
- Pick: tracking one payment from a client. Not the full document (`Invoice`), not the person's own balance
  (`Amount`).
- Writes: `amount` number, `paid` number optional (part payments), `date`, `due` date optional, `method`
  text(16) optional. The status is computed from `paid`, `amount` and `due`.
- Parts → actions: `mark press`, `remind press` (`partTiers`: `service`). · States: filled, success.
- Real path: a payment flag stored on the device; card payments need a payment service.
- Wave 6 options: add `style: "link"` (payment QR/link via `KitCode`, `copy`/`share` in `service`) and `installments` history rows.

### `Review` · planned · content · people
What clients said: as a summary (average stars, count and a five-bar breakdown) or as a list of up to five
reviews (stars, name, date, text, and the business's reply).
- Pick: ratings and words from clients. Not the person logging their own feeling (`Scale`), not comments
  in a community (social `Comments`).
- Writes (`summary`): `average` 0–5, `count` number, `bars` exactly 5 numbers. Writes (`list`): `reviews`
  of `stars` 1–5, `name` text(24), `date`, `text` text(240), `reply` text(160) optional, 1–5. `style`.
- Styles: `summary`, `list`. · Parts → actions: reviews `reply press`. · States: filled, empty.
- Real path: reviews left by clients in a shared app.
- Wave 6 note: proposed for **Core promotion** with optional `photos`, `fitScale`, `spoiler` and `verified` props so shops, venues, media and bookings share one review component.

### `Loyalty` · planned · data · phone
A stamp card: four to twelve circles with the earned ones stamped, the reward written under it ("Your 10th
coffee is free"), and redeem when full.
- Pick: rewarding repeat clients with a count to a free thing. Not a habit streak (`Streak`), not a goal of
  one's own (`Ring`).
- Writes: `stamps` number, `of` 4–12, `reward` text(40), `name` text(24) optional.
- Parts → actions: `stamp press` (the business adds one), `redeem press` (when full).
- States: filled, success (reward earned). · Real path: a count per client on the device.

### `Agreement` · planned · input · phone
Terms the client accepts: a short scrollable text, an "I agree" tick, the typed name and the date signed.
- Pick: a waiver, consent or terms signed once. Not jobs to tick (`Checklist`), not a long read (media
  `Article`).
- Writes: `title` text(32), `terms` text(600), `signed` boolean, `name` text(28) optional, `date` optional.
- Parts → actions: `agree check`, `name type`. · States: filled, success (signed).
- Real path: a signed copy kept with the client record, signed on the business's phone; signing on the
  client's own phone needs a shared app.

### `FollowUpQueue` · planned · data · phone
A prioritized client outreach queue ordered by due date showing overdue quotes, unpaid nudges and scheduled check-ins. Each item displays the client, follow-up reason, optional amount and controls to mark done, snooze or send a nudge.
- Pick: prioritized client follow-up actions across quotes, invoices and check-ins. Not one client's header (`ClientCard`), service repair tickets (requests `RequestQueue`), or plain tasks (`Checklist`).
- Writes: `items` of `id` text(24), `clientName` text(24), `kind` (`quote`, `invoice`, `checkin`, `renewal`), `due` date, `note` text(48) optional, `amount` number optional, `done` boolean, `goto` optional, 1–6; `style`. Sort order and overdue status are computed by code from `due`.
- Styles: `queue` (default, overdue, due today and upcoming sections), `compact` (flat prioritized rows).
- Parts → actions: items `root press` (linked), items `done check`, items `snooze press`, items `remind press`. `meta.partTiers: { remind: "service" }`.
- States: filled, empty, loading, success (marked done or snoozed), error (nudge failed to send).
- Real path: follow-up reminders stored on the business phone; sending an outreach nudge uses SMS or email.

### `SavedItems` · planned · content · phone
A reusable rate card of billable services, products and tax defaults for fast quoting and billing. Each entry lists its title, rate, unit and taxable mark with a quick-add control to drop it straight onto an invoice or estimate.
- Pick: saved billable line items and rates for quoting and invoicing. Not one invoice (`Invoice`), customer bookings (booking `ServiceMenu`), or retail stock (commerce `ProductGrid`).
- Writes: `items` of `id` text(24), `title` text(32), `rate` number ≥ 0, `unit` text(12) optional, `taxable` boolean (default true), `category` text(16) optional, 1–12; `style`. Invoice subtotals and tax amounts are computed when items are inserted.
- Styles: `list` (default, rate rows with quick-add actions), `grouped` (grouped under category headings).
- Parts → actions: items `add press`, items `root press`, items `remove press`. `meta.confirmParts: ["remove"]`.
- States: filled, empty, loading, success (item saved or inserted), error (save failed).
- Real path: a reusable billing item library stored locally on the business device.
- Density: `meta.dense: true`, weight 3; a rate card holds up to 12 saved billing items.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `clients` | All my clients | `list`, `queue` | `list`: Header, Search, Chips, List, Button · `queue`: Header, Segmented, FollowUpQueue, Note |
| `client` | One client fully | `overview`, `history`, `waiver` | `overview`: Header[back], ClientCard, KeyValue, List, Loyalty · `history`: Header[back], ClientCard, ClientHistory · `waiver`: Header[back], Agreement, Button |
| `invoice` | Bill or quote a client | `edit`, `status`, `items` | `edit`: Header, Invoice, Button (save) · `status`: Header[back], PaymentStatus, Invoice · `items`: Header[back], SavedItems, Button |
| `reputation` | What clients say | `reviews` | Header, Review[summary], SectionTitle, Review[list] (a title between them, as two of one id may not touch) |

## Worked example: Trot (client side)

The walker's client list shows each owner with their dogs and anything owed. Opening one shows
`ClientCard`, the dogs as a `List`, a `Loyalty` card (every tenth walk free), `ClientHistory` of walks and
payments, an `Invoice` for last month's walks sent with one press, and the owner's key-holding consent as an
`Agreement`.

## Tiers

`Review` needs clients on the app. Sending invoices, reminders, calls and messages are `service` parts;
everything else works on the business's phone.

## Build notes

- Order: `ClientCard`, `ClientHistory`, `Invoice`, `PaymentStatus` (Trot), then `Loyalty`, `Agreement`,
  `Review`, then Wave 6 additions `FollowUpQueue` and `SavedItems`.
- `Invoice` computes subtotal, tax and total from `lines`; the model never writes a total.
- **Wave 6 additions & options:**
  - Added `FollowUpQueue` (`data`, `phone`) for prioritized overdue quotes/invoices/check-ins and `SavedItems` (`content`, `phone`) for reusable billing line items and rates.
  - Proposed Core promotion: `Review` moves to Core with optional `photos`, `fitScale`, `spoiler` and `verified` props.
  - Option/style upgrades: `Invoice` gains `style: "estimate"`, `discount`, `deposit`, `recurring` and `download press` (`service`); `PaymentStatus` gains `style: "link"` (QR/payment link via `KitCode`, `copy`/`share` in `service`) and `installments`; `ClientCard` gains optional `company`, computed `balance` badge and `email press` (`service`).

## Open questions

- **Several businesses' clients in one app?** Default: no; one business per app.

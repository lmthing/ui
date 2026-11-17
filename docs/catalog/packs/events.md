# `events` pack

**Status:** new (the additional pack beyond the first plan's ten and the research's five) · **Wave:** 4 ·
**Pick line:** Organising one gathering: guests, RSVPs, seating, tickets, suppliers, gifts. Not travel
(`trips`), not a community's events listing (`social`).

## Purpose

Running one event from the organiser's side and the guest's: who is invited and coming, what they will eat,
where they sit, who supplies what and what it costs, tickets and the door on the day, the gift list, and
finding a date that suits everyone. Weddings, parties, reunions, fundraisers, small conferences.

## Apps it serves

Wedding planner, birthday or anniversary party, school reunion, charity gala, small conference or meetup,
christening or bar mitzvah, office party, community fair with stalls, a club's annual dinner.

## What the core already covers

- Days to go: `Timer` style `until`; the day's programme: `Timeline` style `day`; the venue: `MapPins`.
- The planning checklist by months before: `Checklist` under `SectionTitle`s; notes: `Composer`.
- Choosing a menu or a package: `Choice`; photos after the day: `Gallery`; the hosts: `People`.
- The budget against what is spent: `Progress` and `Amount` (or the `money` pack for shared costs).

## Components (8)

### `GuestList` · planned · data · people
Everyone invited, grouped by party or household: name, RSVP status (yes, no, maybe, waiting) as a pill,
plus-ones, dietary needs, and the counts per status at the top.
- Pick: who is invited and who is coming. Not members of a group (`People`), not clients (customers
  `ClientCard`), not a sports squad's availability (sports `Squad`).
- Writes: `guests` of `name` text(24), `party` text(16) optional, `status` (`yes`, `no`, `maybe`,
  `waiting`), `plus` 0–4, `diet` text(16) optional, `goto`, 1–30. Counts are computed. · Dense.
- Parts → actions: guests `root press`, `remind press` (to everyone waiting; `partTiers`: `service`).
- States: filled, empty, loading. · Real path: the list on the organiser's device; reminders are sent by
  message or email. · Aliases: guestlist, guests, invitees, rsvps.

### `RSVP` · planned · input · people
The guest's reply: the event's name and date at the top, attending yes or no as two large buttons, then
plus-ones, a meal choice and a note, and send.
- Pick: a guest answering an invitation. Not a vote among options (social `Poll`), not booking a slot
  (booking `Slots`).
- Writes: `event` text(32), `date`, `plusMax` 0–4, `meals` text(20) each 0–4, `answer` (`none`, `yes`,
  `no`).
- Parts → actions: `yes press`, `no press` (in `confirmParts`), `plus set`, `meal select`, `note type`,
  `send press`.
- States: filled, success (sent). · Real path: the reply sent to the organiser through a shared app or link.
- Aliases: rsvp, attend, attending.

### `Seating` · planned · input · phone
Tables drawn as circles or long rectangles with seats as dots, each seat showing a guest's initials; tapping
a table lists its guests; unseated guests wait in a tray below.
- Pick: who sits where. Not a list of guests (`GuestList`), not a staff rota (team `Roster`).
- Writes: `tables` of `label` text(12), `shape` (`round`, `long`), `seats` 2–16, `guests` text(24) each,
  1–20; `unseated` text(24) each 0–20. · Dense.
- Parts → actions: tables `root press`, guests `root move` (to a table label). · States: filled, empty.
- Real path: the plan on the organiser's device. · Kit: `KitSeatMap`. · Aliases: seating, seatingplan, tableplan.

### `Vendors` · planned · data · phone
The suppliers (venue, caterer, photographer, band, florist): each with its role icon, name, the agreed cost,
what is paid and what is due when, booked or still to book, and a call button.
- Pick: suppliers for one event and what is owed to each. Not a business's clients (customers
  `ClientCard`), not the person's own bills (money `Bills`).
- Writes: `vendors` of `role` (`venue`, `food`, `photo`, `music`, `flowers`, `cake`, `transport`,
  `other`), `name` text(24), `cost` number, `paid` number, `due` date optional, `booked` boolean, `phone`
  text(20) optional, 1–6. The total cost, paid and left are computed and drawn at the top.
- Parts → actions: vendors `root press`, vendors `call press` (`partTiers`: `service`). · States: filled, empty.
- Real path: suppliers stored on the device. · Aliases: vendors, suppliers, contractors.

### `Ticket` · planned · content · phone
An admission ticket: the event, date, time and place, the ticket type and the holder's name, and a large
scannable code with the ticket number.
- Pick: a ticket for an event the app runs. Not a travel confirmation (trips `Reservation`), not a promo code
  (commerce `Promo`).
- Writes: `event` text(32), `date`, `time` HH:MM, `place` text(32), `type` text(16) ("Adult", "VIP"),
  `holder` text(24), `number` text(12).
- States: filled, success (scanned in). · Real path: a ticket issued by the app; scanning at the door needs
  the organiser's `Door`. · Kit: `KitTicket`. · Aliases: ticket, admission, eventticket.

### `Door` · planned · action · ok
The door on the day: a scanner for tickets, a large count of arrivals against tickets sold, the last few
scanned with their names, and a search to check someone in by hand.
- Pick: checking people in at the door. Not taking a photo (`Camera`), not a list of guests before the day
  (`GuestList`).
- Writes: `hint` text(40). Expected arrivals come from the tickets or the guest list; arrivals and the
  last scanned come from the scans.
- Parts → actions: `scan scan`, `search type`, results `checkin press`. · States: filled, success (checked
  in), error (already in, not found).
- Real path: the camera scans codes (`ok`); several doors at once need a shared app.
- Aliases: door, checkin, scanner, entrance.

### `Registry` · planned · input · people
The gift list: each gift with a photo, a price, where to buy it, and "Claim" for guests or who claimed it for
the hosts; claimed ones dimmed.
- Pick: gifts guests can choose and claim. Not a shop (commerce `ProductGrid`), not one's own wishlist of
  things to buy (inventory `Wishlist`).
- Writes: `gifts` of `title` text(28), `photo` optional, `price` number optional, `where` text(24)
  optional, `claimed` boolean, `by` text(16) optional (hosts only), 1–12; `host` boolean. · Dense.
- Parts → actions: gifts `claim press`, gifts `unclaim press` (in `confirmParts`). · States: filled, empty, success.
- Real path: the list in a shared app so two guests never claim the same gift. · Aliases: registry, giftlist, gifts.

### `FindDate` · planned · input · people
Finding a date: candidate dates as columns, people as rows, each cell yes, maybe or no, the best date
highlighted with its count.
- Pick: finding the date that suits most people. Not a vote on options in general (social `Poll`), not
  choosing a day on a calendar (`Calendar`).
- Writes: `dates` of `date`, `time` HH:MM optional, 2–6; `people` of `name` text(16), `answers` (`yes`,
  `maybe`, `no`, `none`) one per date, 1–12. The best date is computed. · Dense.
- Parts → actions: own row cells `root select` (yes, maybe or no). · States: filled, empty.
- Real path: answers collected in a shared app or link. · Aliases: finddate, datepoll, schedulingpoll.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `plan_event` | The event at a glance | `overview` | Header, Timer[until], Checklist, Button |
| `guests` | Who is coming and where they sit | `list`, `seating`, `reply` | `list`: Header, Chips, GuestList · `seating`: Header, Stats, Seating · `reply`: Hero[photo], KeyValue, MapPins, RSVP |
| `suppliers` | Who supplies what | `vendors`, `gifts` | `vendors`: Header, Vendors, Button · `gifts`: Header, Note, Registry |
| `on_the_day` | Running it | `door`, `ticket`, `date` | `door`: Header, Door, Note · `ticket`: Header[back], Ticket, MapPins · `date`: Header, FindDate, Button |

## Worked example: Vows

A small wedding of 80. `plan_event` counts down 64 days with this month's jobs; `GuestList` shows 52 yes
and 9 waiting; `guests/list` filters by "waiting"; `guests/seating` places eight round tables; `suppliers/vendors`
shows the caterer with half paid and the band still to book; guests reply on `guests/reply` and claim gifts
from the `Registry`; on the day `on_the_day/door` checks guests in. Signature: `check_burst` on the jobs.

## Aliases that shadow the core

No alias here matches a core alias.

## Tiers

`GuestList`, `RSVP`, `Registry` and `FindDate` matter only with guests on a shared app or link; `Door` uses
the camera (`ok`). `Seating`, `Vendors` and `Ticket` work on the organiser's phone.

## Build notes

- Order: `GuestList`, `RSVP`, `Vendors`, `Seating`, `Registry`, `FindDate`, `Ticket`, `Door`.
- `GuestList` reads as counts and one line per party, not one line per guest, to stay within read budgets.

## Open questions

- **Paid tickets?** Default: the price is a `Choice` with `value`; taking payment is commerce `Checkout`.

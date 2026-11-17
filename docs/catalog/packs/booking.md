# `booking` pack

**Status:** revised · **Wave:** 1 · **Pick line:** Booking time with someone: appointments, classes,
slots. Not selling goods (`commerce`).

## Purpose

Someone offers their time (a walk, a haircut, a lesson, a class) and someone else books a piece of it. The
pack draws both sides: the customer choosing a service and a time, and the provider setting when they work
and seeing who is coming. It is the first pack built, because Trot (dog walking) needs it.

## Apps it serves

Dog walker or sitter, hairdresser or barber, personal trainer, tutor, yoga or pottery studio classes,
physiotherapist or massage, cleaner, car wash, photographer, meeting-room booking.

## What the core already covers

- The day's bookings in order: `Timeline` (`day`, or `hours` to show gaps).
- Which days have bookings: `Calendar` with marked days.
- The provider's identity: `Profile`; the customer's details: `KeyValue`.
- A booking's price: `Amount`; confirming a cancellation: `Button` with `confirm`, or `Sheet`.
- Reminders: `Field` kind `repeat` and the `LockScreen` surface.

## Components (8)

### `ServiceMenu` · planned · content · phone
The services on offer as rows with a name, a duration, a price and a short line, grouped under optional
headings, each opening its booking flow.
- Pick: what can be booked and for how long. Not things for sale (commerce `ProductGrid`), not a list of
  appointments already made (`Appointment`).
- Writes: `services` of `name` text(28), `minutes` 5–600, `price` number optional, `currency`, `sub`
  text(60) optional, `group` text(20) optional, `goto`, 1–8.
- Styles: `rows` (default), `cards` (with a photo per service).
- Parts → actions: items `root press`. · States: filled, empty, loading.
- Real path: services stored on the device by the provider. · Aliases: services, price list, menu, treatments.

### `Slots` · planned · input · phone
A day's free start times as a grid of chips (09:00, 09:30…), taken ones dimmed and disabled, with a day
switcher above. Picking one highlights it.
- Pick: choosing a start time on one day. Not choosing a day (`Calendar`), not setting working hours
  (`Availability`).
- Writes: `day` date, `times` of `time` HH:MM and `taken` boolean, 1–24, `at` optional, `minutes` (slot
  length, shown under the grid).
- Styles: `grid` (default), `list` (for long slots with an end time each).
- Parts → actions: items `root select`, `prev press`, `next press` (day switcher).
- States: filled, empty ("No free times this day" from copy), loading.
- Real path: free times computed on the device from working hours minus booked appointments.
- Aliases: time slots, times, availability picker, timeslots. · Kit: `KitSlotGrid`.

### `Availability` · planned · input · phone
The provider's working week: each weekday as a row with a switch and its hours (09:00–17:00), with
optional breaks.
- Pick: setting when bookings can be made. Not one day's free times (`Slots`), not staff shifts (team
  `Shift`).
- Writes: `days` of `day` (mon…sun), `on` boolean, `from` HH:MM, `to` HH:MM, `break` text(11) optional
  ("12:00–13:00"), exactly 7.
- Parts → actions: items `toggle toggle`, `from type`, `to type`. · States: filled.
- Real path: working hours stored on the device. · Aliases: working hours, opening hours, schedule, hours.

### `StaffPicker` · planned · input · people
Who the booking is with: avatars in a row with names, plus "Anyone" first. The chosen one is ringed.
- Pick: choosing which person does the service. Not other people involved in general (`People`).
- Writes: `staff` of `name` text(20), `photo`, `role` text(20) optional, 1–6; `anyone` boolean (default
  true); `at` optional.
- Parts → actions: items `root select`. · States: filled, loading.
- Real path: each staff member has their own working hours and bookings in a shared app.
- Aliases: staff, stylist, choose person, team member.

### `BookingSummary` · planned · content · phone
What is about to be booked, before confirming: service, with whom, the day and time, the length, where, the
price and the cancellation note.
- Pick: review a booking before or after making it. Not a receipt for goods (commerce `OrderSummary`), not
  facts about any one thing (`KeyValue`).
- Writes: `service` text(28), `with` text(24) optional, `date`, `time`, `minutes`, `place` text(40)
  optional, `price` number optional, `currency`, `policy` text(100) optional.
- Parts → actions: `edit press` (goes back to change the slot). · States: filled, success (booked).
- Real path: a booking drafted on the device; sending it to the provider needs a shared app.
- Aliases: booking details, confirm booking, appointment summary, review.

### `Capacity` · planned · data · phone
How full a class or session is: "8 of 12 places" with a slim bar and the people coming as avatars,
turning `warn` when nearly full and `bad` when full.
- Pick: places left in a group session. Not progress toward a personal goal (`Progress`, `Ring`).
- Writes: `taken` number, `of` number, `label` text(28) optional, `waitlist` number optional.
- States: filled. · Real path: bookings counted against a session's limit on the device.
- Aliases: spots left, places, spaces, class size, attendance.

### `Appointment` · planned · content · phone
One booking as a card: day and time large on the left, service and person on the right, a status badge
(confirmed, pending, cancelled, done), and reschedule and cancel actions for upcoming ones.
- Pick: one booking to see or change. Not choosing a time (`Slots`), not the whole day in order
  (`Timeline`).
- Writes: `service` text(28), `with` text(24), `date`, `time`, `status` (`confirmed`, `pending`,
  `cancelled`, `done`), `place` text(40) optional, `goto`.
- Styles: `card` (default), `row` (compact inside lists).
- Parts → actions: `root press`, `reschedule press`, `cancel press` (opens a confirm sheet).
- States: filled, loading. · Real path: a booking record on the device.
- Aliases: booking, appointment card, upcoming, session.

### `Waitlist` · planned · action · people
A full session's join-the-waitlist panel: the place in line, how many are ahead and a join or leave
button.
- Pick: a session is full and the person can wait for a place. Not how full it is (`Capacity`).
- Writes: `position` number optional, `ahead` number, `joined` boolean.
- Parts → actions: `join press`, `leave press`. · States: filled, success.
- Real path: a queue kept in a shared app; the next person is told when a place opens (needs notifications).
- Aliases: waiting list, queue, notify me.

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `book` | Choose a service and a time | `service`, `time`, `confirm` | `service`: Header, ServiceMenu · `time`: Header, Calendar[week], Slots, Button · `confirm`: Header, BookingSummary, Button |
| `appointments` | My upcoming and past bookings | `upcoming`, `history` | Header, Segmented, Appointment ×n \| Timeline, Button |
| `schedule` | The provider's day | `day`, `week` | Header, Calendar[week], Timeline[hours], Stats |
| `hours` | When I take bookings | `simple` | Header, Availability, Field[repeat], Button |

## Worked example: Trot

A dog walker's app. The walker sets their week (`hours`), lists walks of 30 and 60 minutes and a home visit
(`ServiceMenu`), and sees today's walks on an hour rail (`schedule`). A client books a walk (`book`), sees it
under `appointments`, and the walker's `customers` pack shows the client and their dogs. Signature:
`day_unfold` on the schedule.

## Aliases that shadow the core

With `booking` loaded: `slots`, `time slots` → `Slots` (otherwise `Chips`); `booking`, `appointment` →
`Appointment` (otherwise `Card`); `opening hours` → `Availability` (otherwise `KeyValue`).

## Tiers

`StaffPicker` and `Waitlist` need other people. A booking made by a customer through the provider's app is
always `people`; the first showcase shows the provider's side, which works on the phone alone.

## Build notes

- Order: `ServiceMenu`, `Slots`, `BookingSummary`, `Appointment` (Trot's book flow), then `Availability`,
  `Capacity`, `StaffPicker`, `Waitlist`.
- `Slots` reads as `[select:3/12]` with the taken times printed `(taken)`, so an agent never picks one.
- Time zones: every time is local to the provider; a reader prints times as written.

## Open questions

- **Recurring bookings (every Tuesday)?** Default: `Field` kind `repeat` on the `confirm` layout, no new
  component.
- **Deposits?** Default: a `customers` `PaymentStatus` after booking; taking money stays tier `service`.

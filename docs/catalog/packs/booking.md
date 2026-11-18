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

- The day's bookings in order: `Timeline` (`day`, or `hours` to show gaps; `DayTimeline` if the core merge
  does not happen).
- Which days have bookings, and choosing a day: `Calendar` with marked days.
- How full a class is: `Progress` style `compact` ("8 of 12 places", `over: bad`) with `People` style
  `stack` for who is coming. The first plan's `Capacity` is dropped as a near miss with `Progress`.
- The provider's identity: `Profile`; the customer's details: `KeyValue`; a price: `Amount`.
- Repeating a booking every week: `Field` kind `repeat`; reminders: the `LockScreen` surface.

`ServiceMenu` is kept although a `List` can show services: it holds group headings inside one component, up
to 12 services, a duration and price as numbers the app can compute with, and a book action per service.

## Components (6)

### `ServiceMenu` · planned · content · phone
The services on offer as rows with a name, a duration, a price and a short line, grouped under optional
headings, each with a book action.
- Pick: what can be booked and for how long. Not things for sale (commerce `ProductGrid`), not bookings
  already made (`Appointment`), not a plain list of things (`List`).
- Writes: `services` of `name` text(28), `minutes` 5–600, `price` number optional, `sub` text(60) optional,
  `group` text(20) optional, `photo` optional, `goto`, 1–12; `style`.
- Styles: `rows` (default), `cards` (with a photo per service).
- Parts → actions: items `root press`. · States: filled, empty, loading.
- Real path: services stored on the device by the provider.

### `Slots` · planned · input · phone
The free start times of the day chosen in the `Calendar` above it, as a grid of chips (09:00, 09:30…),
taken ones dimmed and disabled. Picking one highlights it.
- Pick: choosing a start time on one day. Not choosing the day (`Calendar`, on the same screen), not
  setting working hours (`Availability`).
- Writes: `times` of `time` HH:MM and `taken` boolean, 1–24; `at` optional; `minutes` (slot length, shown
  under the grid); `style`.
- Styles: `grid` (default), `list` (long slots with an end time each).
- Parts → actions: items `root select` (free times only). · States: filled, empty ("No free times" from
  copy), loading.
- Real path: free times computed on the device from working hours minus bookings.
- Kit: `KitSlotGrid`.

### `Availability` · planned · input · phone
The provider's working week: each weekday as a row with a switch and its hours (09:00–17:00), with an
optional break.
- Pick: setting when bookings can be made. Not one day's free times (`Slots`), not staff shifts (team
  `Roster`), not a venue's opening hours (places `Hours`).
- Writes: `days` of `day` (mon…sun), `on` boolean, `from` HH:MM, `to` HH:MM, `breakFrom` and `breakTo`
  HH:MM optional, exactly 7.
- Parts → actions: items `toggle toggle`, items `from type`, items `to type`. · States: filled.
- Real path: working hours stored on the device.

### `StaffPicker` · planned · input · people
Who the booking is with: avatars in a row with names, "Anyone" first, the chosen one ringed.
- Pick: choosing which person does the service. Not other people involved in general (`People`).
- Writes: `staff` of `name` text(20), `photo`, `role` text(20) optional, 1–6; `anyone` boolean (default
  true); `at` optional.
- Parts → actions: items `root select`. · States: filled, loading.
- Real path: each staff member has their own working hours and bookings in a shared app.

### `Appointment` · planned · content · phone
One booking: day and time large, service and person, place, status badge (confirmed, pending, cancelled,
done); as a card with reschedule and cancel, or as a summary before booking with the length, price and the
cancellation policy.
- Pick: one booking to see, change or confirm. Not choosing a time (`Slots`), not the whole day in order
  (`Timeline`), not a staff member's shift (team `Shift`), not an order of goods (commerce `OrderSummary`).
- Writes: `service` text(28), `with` text(24) optional, `date`, `time` HH:MM, `minutes`, `place` text(40)
  optional, `price` number optional, `status` (`confirmed`, `pending`, `cancelled`, `done`), `policy`
  text(100) optional (`summary` only), `goto` (reschedule target), `style`.
- Styles: `card` (default), `summary` (before booking: every detail with an edit link; status hidden).
- Parts → actions: `root press`, `reschedule press` (goes to `goto`), `cancel press` (in `confirmParts`),
  `edit press` (`summary`; goes to `goto`). · States: filled, loading, success (booked).
- Real path: a booking record on the device; a customer booking through the provider's app needs a shared
  app (`partTiers`: none on the provider's side).

### `Waitlist` · planned · action · people
A full session's join-the-waitlist panel: the place in line, how many are ahead, and join or leave.
- Pick: a session is full and the person can wait for a place. Not how full it is (`Progress`).
- Writes: `position` number optional, `ahead` number, `joined` boolean.
- Parts → actions: `join press`, `leave press` (in `confirmParts`). · States: filled, success.
- Real path: a queue in a shared app; the next person is told when a place opens (notifications, `ok`).

## Archetypes (4)

| Archetype | Job | Layouts | Recipe |
| --- | --- | --- | --- |
| `book` | Choose a service and a time | `service`, `time`, `confirm` | `service`: Header, ServiceMenu, Note · `time`: Header, StaffPicker, Calendar[week], Slots, Button · `confirm`: Header, Appointment[summary], Field[repeat], Button |
| `appointments` | My upcoming and past bookings | `upcoming`, `history` | `upcoming`: Header, Segmented, Appointment, List · `history`: Header, Segmented, Timeline[history] |
| `schedule` | The provider's day | `day`, `class` | `day`: Header, Calendar[week], Timeline[hours], Stats · `class`: Header[back], KeyValue, Progress[compact], People[stack], Waitlist |
| `hours` | When I take bookings | `simple` | Header, Availability, Button |

## Worked example: Trot

A dog walker's app. The walker sets their week (`hours`), lists 30- and 60-minute walks and a home visit
(`ServiceMenu`), and sees today's walks on an hour rail (`schedule`). A client books a walk (`book`), the
next one shows as an `Appointment` card under `appointments`, and the `customers` pack shows the client and
their dogs. Signature: `day_unfold` on the schedule.

## Tiers

`StaffPicker` and `Waitlist` need other people. The provider's side (services, hours, schedule, their own
bookings) works on the phone alone, so the first showcase shows it; the customer's side needs a shared app.

## Build notes

- Order: `ServiceMenu`, `Slots`, `Appointment` (Trot's book flow), then `Availability`, `StaffPicker`,
  `Waitlist`.
- `Slots` reads as `[select:3/12]` with taken times printed `(taken)`, so an agent never picks one.
- Every time is local to the provider; a reader prints times as written.

## Open questions

- **Deposits?** Default: customers `PaymentStatus` after booking; taking money stays a `service` part.

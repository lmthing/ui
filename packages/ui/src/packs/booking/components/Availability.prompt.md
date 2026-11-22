## Purpose

Set the working week during which people can book.

## Pick

Seven weekdays with working switches, start and end times and breaks. Not one time field (Field), one day's free starts (Slots), staff shifts (Roster), or venue opening hours (Hours).

## Writer

- Write each weekday once, mon through sun. End follows start; breaks need both endpoints inside working hours.
- Leave detail null unless requested. For working times without visible breaks, use detail "brief" and keep the breaks in the data.
- Use bufferMinutes only for requested gaps between bookings. Use dateOverrides only for specific dates the provider is not taking bookings (kind "blocked" or "holiday").

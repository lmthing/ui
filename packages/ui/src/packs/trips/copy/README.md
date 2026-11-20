# Trips copy

Data-only formatting for trips components. Import through `index.ts`; built-in words live in `../lang`.

- `Clocks.ts` calculates and formats simultaneous local times, daylight and offsets from home.
- `Converter.ts` validates the host exchange rate, projects both amounts and formats the Converter reading.
- `Itinerary.ts` formats itinerary days, stops and travel durations.
- `PackingList.ts` formats packing progress, quantities and addressed reading.
- `Reservation.ts` formats ticket dates, times and reading text.
- `TravelDocs.ts` formats masked document details, expiry warnings and trip dates for the view and reading.
- `Weather.ts` validates weather data and formats display copy and addressed reading.
- `index.ts` exports pack copy.

export const en = {
  clocks: {
    home: "Home",
    day: "Daytime",
    night: "Nighttime",
    offset: (hours: string | undefined, minutes: string | undefined, direction: -1 | 0 | 1) =>
      `${direction > 0 ? "+" : direction < 0 ? "−" : ""}${hours ? `${hours} h` : ""}${hours && minutes ? " " : ""}${minutes ? `${minutes} min` : ""}`,
    placeLine: (place: string, time: string, offset: string, daylight: string) =>
      `${place}: ${time}, ${offset}, ${daylight}`,
  },
  itinerary: {
    untimed: "—",
    hours: (hours: string, minutes?: string) => `${hours} h${minutes ? ` ${minutes} min` : ""}`,
    dayLabel: (date: string, place: string) => `${place}, ${date}`,
    dayLine: (date: string, place: string, stops: string[]) => `${date} ${place}: ${stops.join(", ")}`,
  },
  packing: {
    progress: "Packing progress",
    allPacked: "All packed",
    add: "Add an item",
    quantity: (count: string) => `×${count}`,
    itemLabel: (name: string, quantity: string) => `${name}, ${quantity}`,
  },
  travelDocs: {
    kinds: {
      passport: "Passport",
      visa: "Visa",
      insurance: "Travel insurance",
      licence: "Driving licence",
      health: "Vaccination",
      other: "Document",
    },
    tripEnds: (date: string) => `Trip ends ${date}`,
    expires: (date: string) => `Expires ${date}`,
    numberMasked: "No. ••••",
    numberMissing: "No number added",
    beforeTripEnd: "Expires before trip ends",
    onTripEnd: "Expires on trip end date",
    soonAfterTrip: "Expires soon after trip",
    open: (kind: string, owner: string) => `${kind}, ${owner}`,
  },
};

export type TripsWords = typeof en;

export type TripsWords = {
  itinerary: {
    untimed: string;
    hours: (hours: string, minutes?: string) => string;
    dayLabel: (date: string, place: string) => string;
    dayLine: (date: string, place: string, stops: string[]) => string;
  };
  travelDocs: {
    kinds: Record<"passport" | "visa" | "insurance" | "licence" | "health" | "other", string>;
    tripEnds: (date: string) => string;
    expires: (date: string) => string;
    numberMasked: string;
    numberMissing: string;
    beforeTripEnd: string;
    onTripEnd: string;
    soonAfterTrip: string;
    open: (kind: string, owner: string) => string;
  };
};

export const en = {
  itinerary: {
    untimed: "—",
    hours: (hours, minutes) => `${hours} h${minutes ? ` ${minutes} min` : ""}`,
    dayLabel: (date, place) => `${place}, ${date}`,
    dayLine: (date, place, stops) => `${date} ${place}: ${stops.join(", ")}`,
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
    tripEnds: (date) => `Trip ends ${date}`,
    expires: (date) => `Expires ${date}`,
    numberMasked: "No. ••••",
    numberMissing: "No number added",
    beforeTripEnd: "Expires before trip ends",
    onTripEnd: "Expires on trip end date",
    soonAfterTrip: "Expires soon after trip",
    open: (kind, owner) => `${kind}, ${owner}`,
  },
} satisfies TripsWords;

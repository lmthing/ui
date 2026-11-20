export const en = {
  itinerary: {
    untimed: "—",
    hours: (hours: string, minutes?: string) => `${hours} h${minutes ? ` ${minutes} min` : ""}`,
    dayLabel: (date: string, place: string) => `${place}, ${date}`,
    dayLine: (date: string, place: string, stops: string[]) => `${date} ${place}: ${stops.join(", ")}`,
  },
  reservationKinds: {
    flight: "Flight",
    train: "Train",
    bus: "Bus",
    ferry: "Ferry",
    stay: "Stay",
    car: "Car rental",
    ticket: "Ticket",
  },
  reservationStops: (kind: string) => {
    if (kind === "stay") return { start: "Check-in", end: "Check-out" };
    if (kind === "car") return { start: "Pickup", end: "Return" };
    if (kind === "ticket") return { start: "Starts", end: "Ends" };
    return { start: "Departure", end: "Arrival" };
  },
  reservationStamp: (date: string, time: string) => `${date} ${time}`,
  reservationSeat: (kind: string, seat: string) => (kind === "stay" ? seat : `Seat ${seat}`),
  reservationRef: "Reference",
  reservationReadRef: (quotedRef: string) => `ref ${quotedRef}`,
  copyReservationRef: "Copy reference",
  openReservation: (title: string) => `View reservation: ${title}`,
  reservationCode: "Scannable reservation code",
};

export type TripsWords = typeof en;

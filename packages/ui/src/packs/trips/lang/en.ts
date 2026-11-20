export const en = {
  itinerary: {
    untimed: "—",
    hours: (hours: string, minutes?: string) => `${hours} h${minutes ? ` ${minutes} min` : ""}`,
    dayLabel: (date: string, place: string) => `${place}, ${date}`,
    dayLine: (date: string, place: string, stops: string[]) => `${date} ${place}: ${stops.join(", ")}`,
  },
};

export type TripsWords = typeof en;

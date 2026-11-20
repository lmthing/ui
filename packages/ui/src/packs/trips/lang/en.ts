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
};

export type TripsWords = typeof en;

export const en = {
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
};

export type TripsWords = typeof en;

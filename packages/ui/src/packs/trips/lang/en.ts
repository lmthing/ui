export const en = {
  converter: {
    home: "Home amount",
    local: "Local amount",
    swap: "Swap currencies",
    amountHint: "Enter amount",
    currencyLabel: (currency: string, side: string) => `${currency} · ${side}`,
    amount: (label: string, value: string) => `${label}: ${value}`,
    rateDate: (date: string) => `Rate as of ${date}`,
    noRate: "Exchange rate unavailable",
  },
  itinerary: {
    untimed: "—",
    hours: (hours: string, minutes?: string) => `${hours} h${minutes ? ` ${minutes} min` : ""}`,
    dayLabel: (date: string, place: string) => `${place}, ${date}`,
    dayLine: (date: string, place: string, stops: string[]) => `${date} ${place}: ${stops.join(", ")}`,
  },
};

export type TripsWords = typeof en;

export const en = {
  closed: "Closed",
  rating: (value: string, max: string) => `Rating ${value} out of ${max}`,
  ratingSkeleton: (value: string) => `★\u2004★\u2004★\u2004★\u2004★\u2004${value}`,
  priceLevel: (value: string, max: string) => `Price level ${value} out of ${max}`,
  placeHours: (opens: string, closes: string) => `${opens}–${closes}`,
  openNow: "Open now",
  closesAt: (time: string) => `Closes ${time}`,
  hoursOpen: (time: string) => `Open now · closes ${time}`,
  hoursClosed: "Closed now",
  hoursToday: (day: string) => `${day} · Today`,
  hoursSpecial: "Special hours",
  hoursSpecialToday: "Special hours today",
  hoursDash: "–",
  hoursDayLine: (day: string, hours: string) => `${day}: ${hours}`,
  hoursNoticeLine: (date: string, text: string, formattedDate?: string) =>
    `${date}: ${JSON.stringify(text)}${formattedDate ? ` (${formattedDate})` : ""}`,
  distanceAway: (value: string) => `${value} km away`,
  addressDirections: "Directions",
  addressCopy: "Copy address",
  addressCall: (phone: string) => `Call ${phone}`,
  deliveryStep: {
    preparing: "Preparing",
    picked_up: "Picked up",
    on_the_way: "On the way",
    nearby: "Nearby",
    delivered: "Delivered",
  },
};

export type PlacesWords = typeof en;

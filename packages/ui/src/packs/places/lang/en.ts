export const en = {
  closed: "Closed",
  rating: (value: string, max: string) => `Rating ${value} out of ${max}`,
  ratingSkeleton: (value: string) => `★\u2004★\u2004★\u2004★\u2004★\u2004${value}`,
  priceLevel: (value: string, max: string) => `Price level ${value} out of ${max}`,
  placeHours: (opens: string, closes: string) => `${opens}–${closes}`,
  openNow: "Open now",
  closesAt: (time: string) => `Closes ${time}`,
  distanceAway: (value: string) => `${value} km away`,
  deliveryStep: {
    preparing: "Preparing",
    picked_up: "Picked up",
    on_the_way: "On the way",
    nearby: "Nearby",
    delivered: "Delivered",
  },
};

export type PlacesWords = typeof en;

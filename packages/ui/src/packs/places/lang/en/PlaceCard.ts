export const words = {
  rating: (value: string, max: string) => `Rating ${value} out of ${max}`,
  ratingSkeleton: (value: string) => `${value}\u2004★\u2004★\u2004★\u2004★\u2004★`,
  priceLevel: (value: string, max: string) => `Price level ${value} out of ${max}`,
  openNow: "Open now",
  closesAt: (time: string) => `Closes ${time}`,
  distanceAway: (value: string) => `${value} km away`,
  milesAway: (value: string) => `${value} mi away`,
  placeUnits: "Distance units",
  placeKm: "km",
  placeMi: "mi",
  placeSave: "Save place",
};

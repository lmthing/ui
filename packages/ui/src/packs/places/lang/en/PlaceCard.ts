export const words = {
  rating: (value: string, max: string) => `Rating ${value} out of ${max}`,
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

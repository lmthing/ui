export const packIds = [
  "booking",
  "customers",
  "commerce",
  "money",
  "team",
  "data",
  "social",
  "media",
  "learning",
  "places",
  "health",
  "mind",
  "kitchen",
  "home",
  "trips",
  "events",
  "inventory",
  "sports",
] as const;

export type PackId = (typeof packIds)[number];

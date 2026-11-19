/** Shared labels for household contracts and their accessible readings. */
export const homeLabels = {
  points: "points",
  cost: "cost",
  next: "Done, next",
  skip: "Skip",
  claim: "Claim prize",
  add: "Add event",
  last: "Last done",
  reading: "Reading",
  setPoint: "Set point",
  normal: "Normal range",
  outOfRange: "Outside normal range",
  apply: "Apply scene",
  secure: "Apply scene, asks first",
  locked: "Locked",
  unlocked: "Unlocked",
  feed_left: "Feed left",
  feed_right: "Feed right",
  bottle: "Bottle",
  nappy: "Nappy",
  sleep: "Sleep",
  none: "None running",
} as const;

export const deviceUnits = {
  celsius: "°C",
  percent: "%",
  ppm: "ppm",
  lux: "lux",
} as const;

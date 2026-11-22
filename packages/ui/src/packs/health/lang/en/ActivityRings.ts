export const words = {
  activityRing: (label: string, value: string, goal: string | undefined, unit: string) =>
    `${label}: ${value}${goal === undefined ? "" : ` ${goal}`} ${unit}`,
  activityScore: (label: string, value: string, goal: string) => `${label}: ${value} ${goal}`,
};

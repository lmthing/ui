/** Neutral working-week defaults and labels for paired time controls. */
export const availabilityDefaults = { from: "09:00", to: "17:00" } as const;
export const availabilityLabels = { from: "From", to: "To", break: "Break" } as const;
export const breakLine = (from: string, to: string): string => `${availabilityLabels.break} ${from}–${to}`;

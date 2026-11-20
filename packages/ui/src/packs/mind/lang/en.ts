export const en = {
  editSleep: "Edit sleep times",
  sleep: {
    log: "Log sleep",
    duration: "Time asleep",
    bed: "Bedtime",
    wake: "Wake time",
    quality: "Sleep quality",
    qualityLevels: ["Very poor", "Poor", "Fair", "Good", "Very good"] as const,
    average: "7-night average",
    import: "Only phone import needs permission",
    asleepShare: (percent: string) => `${percent} asleep`,
    awakeTime: (duration: string) => `${duration} awake`,
    hours: (hours: string) => `${hours} h`,
    hoursAndMinutes: (hours: string, minutes: string) => `${hours} h ${minutes} min`,
    reading: (label: string, value: string) => `${label}: ${value}`,
    minuteReading: (value: string, minutes: string) => `${value} (${minutes})`,
  },
};

export type MindWords = typeof en;

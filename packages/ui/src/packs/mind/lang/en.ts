export const en = {
  feelings: {
    title: "Name what you feel",
    hint: "Choose a family, then pick words that fit.",
    families: "Feeling families",
    remaining: (count: string) => `remaining ${count}`,
    noWords: "No additional words in this family.",
    placeholder: (item: string, option: string) => `${item} · ${option}`,
  },
  editSleep: "Edit sleep times",
  breathe: {
    phase: { inhale: "Breathe in", hold: "Hold", exhale: "Breathe out", rest: "Rest" },
    complete: "Exercise complete",
    roundsLeft: (count: string, plural: Intl.LDMLPluralRule) =>
      `${count} ${plural === "one" ? "round" : "rounds"} left`,
  },
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
  entriesEmpty: "No journal entries yet",
  entryPhoto: "Journal photo",
  entryMood: ["Very low", "Low", "Okay", "Good", "Very good"] as const,
  entryTags: (tags: readonly string[]) => tags.join(" · "),
  entryLabel: (date: string, excerpt: string) => `${date} · ${excerpt}`,
  entrySkeleton: {
    month: "Journal entries",
    date: "Date of entry",
    excerpt: "The text of a journal entry will appear here.",
    tags: "Tags for this entry",
  },
};

export type MindWords = typeof en;

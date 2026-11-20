import type { LDMLPluralRule } from "../../../catalog";

const progress = "Progress";

export const en = {
  collection: {
    playAll: "Play all",
    follow: "Follow",
    following: "Following",
    count: (count: string, form: LDMLPluralRule, episodes: boolean) =>
      `${count} ${episodes ? (form === "one" ? "episode" : "episodes") : form === "one" ? "track" : "tracks"}`,
    hours: (hours: string) => `${hours} h`,
    minutes: (minutes: string) => `${minutes} min`,
    seconds: (seconds: string) => `${seconds} sec`,
    duration: (hours: string, minutes: string) => `${hours} ${minutes}`,
    summary: (count: string, duration: string) => `${count} · ${duration}`,
  },
  library: {
    empty: "No saved titles yet",
    progress,
    progressReading: (title: string, percent: string) => `${title} · ${progress}: ${percent}`,
  },
};

export type MediaWords = typeof en;

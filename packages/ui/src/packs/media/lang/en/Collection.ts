import type { LDMLPluralRule } from "../../../../catalog";

export const words = {
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
};

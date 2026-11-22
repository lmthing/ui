import type { LDMLPluralRule } from "../../../catalog";

const progress = "Progress";

export const en = {
  chapterList: {
    line: (time: string, title: string, current: boolean) =>
      `${time} ${title}${current ? " · Current chapter" : ""}`,
  },
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
  highlights: {
    quote: (text: string) => `“${text}”`,
  },
  library: {
    empty: "No saved titles yet",
    progress,
    progressReading: (title: string, percent: string) => `${title} · ${progress}: ${percent}`,
  },
  miniPlayer: {
    open: (title: string) => `Open full player: ${title}`,
    artwork: "Cover artwork",
    play: "Play",
    pause: "Pause",
    playing: "Playing",
    paused: "Paused",
    timing: (elapsed: string, remaining: string) => `${elapsed} · ${remaining}`,
  },
  playlist: {
    download: (title: string) => `Download ${title}`,
    nowPlaying: (title: string) => `Now playing: ${title}`,
    completed: "Played",
    position: (percent: string) => `${percent} played`,
    timing: (duration: string, position: string) => `${duration} · ${position}`,
    timingReading: (title: string, timing: string) => `${title} · ${timing}`,
  },
  transcript: {
    empty: "No transcript available",
    label: "Transcript",
    follow: "Follow playback",
    following: "Following playback",
    notFollowing: "Not following playback",
    save: "Save line",
    line: (time: string, speaker: string | undefined, text: string, active: boolean) =>
      `${time} ${speaker ? `${speaker}: ` : ""}${text}${active ? " · Current line" : ""}`,
  },
};

export type MediaWords = typeof en;

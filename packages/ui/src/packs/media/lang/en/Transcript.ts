export const words = {
  transcript: {
    empty: "No transcript available",
    label: "Transcript",
    follow: "Follow playback",
    following: "Following playback",
    notFollowing: "Not following playback",
    save: (text: string) => `Save line to Highlights: ${text}`,
    saving: (text: string) => `Saving line: ${text}`,
    saved: (text: string) => `Saved to Highlights: ${text}`,
    retrySave: (text: string) => `Could not save line. Save again: ${text}`,
    line: (time: string, speaker: string | undefined, text: string, active: boolean) =>
      `${time} ${speaker ? `${speaker}: ` : ""}${text}${active ? " · Current line" : ""}`,
  },
};

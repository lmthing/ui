export const words = {
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

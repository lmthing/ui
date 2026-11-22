export const words = {
  audioMatch: {
    title: "Identify music",
    start: "Start listening",
    again: "Identify another",
    stop: "Stop and identify",
    retry: "Try again",
    open: "Open track",
    recent: "Recent matches",
    artwork: "Cover artwork",
    empty: "Listen to identify music playing nearby",
    listening: "Listening for music",
    requesting: "Preparing to listen",
    matching: "Finding a match",
    success: "Track identified",
    error: "Could not identify the track",
    track: (title: string, artist: string, album?: string) =>
      `${title} · ${artist}${album ? ` · ${album}` : ""}`,
  },
};

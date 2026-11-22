export const words = {
  playlist: {
    download: (title: string) => `Download ${title}`,
    nowPlaying: (title: string) => `Now playing: ${title}`,
    completed: "Played",
    position: (percent: string) => `${percent} played`,
    timing: (duration: string, position: string) => `${duration} · ${position}`,
    timingReading: (title: string, timing: string) => `${title} · ${timing}`,
  },
};

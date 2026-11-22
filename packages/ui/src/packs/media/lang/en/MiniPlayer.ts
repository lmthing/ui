export const words = {
  miniPlayer: {
    open: (title: string) => `Open full player: ${title}`,
    artwork: "Cover artwork",
    play: "Play",
    pause: "Pause",
    playing: "Playing",
    paused: "Paused",
    timing: (elapsed: string, remaining: string) => `${elapsed} · ${remaining} left`,
  },
};

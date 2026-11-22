export const words = {
  mediaLabels: { play: "Play", pause: "Pause", back: "Back 15 seconds", forward: "Forward 15 seconds" },
  playbackOptions: {
    mode: { audio: "Audio", music: "Music", podcast: "Podcast", video: "Video", live: "Live" },
    speed: (value: string) => `${value}×`,
    liked: "Liked",
    shuffle: "Shuffle",
    loop: "Loop",
    playing: "Playing",
    paused: "Paused",
  },
};

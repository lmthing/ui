export const words = {
  soundscape: {
    sleep: "Sleep timer",
    off: "Off",
    minutes: (value: string) => `${value} min`,
    play: "Play mix",
    pause: "Pause mix",
    volume: (label: string) => `${label} volume`,
    volumeReading: (label: string, value: string) => `${label}: ${value}`,
    presets: "Saved mixes",
    selectedPreset: (label: string) => `Selected mix: ${label}`,
  },
};

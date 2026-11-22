export const words = {
  kitchenTimerLabels: {
    start: "Start",
    pause: "Pause",
    finished: "Done",
    more: (minutes: string) => `+${minutes} min`,
    reading: (label: string, duration: string) => `${label}: ${duration}`,
  },
};

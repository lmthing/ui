const progress = "Progress";

export const words = {
  library: {
    empty: "No saved titles yet",
    progress,
    progressReading: (title: string, percent: string) => `${title} · ${progress}: ${percent}`,
  },
};

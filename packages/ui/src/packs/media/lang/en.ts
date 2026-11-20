const progress = "Progress";

export const en = {
  library: {
    empty: "No saved titles yet",
    progress,
    progressReading: (title: string, percent: string) => `${title} · ${progress}: ${percent}`,
  },
};

export type MediaWords = typeof en;

const progress = "Progress";

export const words = {
  library: {
    empty: "No saved titles yet",
    progress,
    progressReading: (title: string, percent: string) => `${title} · ${progress}: ${percent}`,
    status: { owned: "Owned", borrowed: "Borrowed", hold: "On hold", finished: "Finished" },
    loanReading: (title: string, detail: string) => `${title} · ${detail}`,
  },
};

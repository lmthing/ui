export const words = {
  pipeline: {
    move: "Move to",
    destination: (stage: string, candidate: string) => `Move ${candidate} to ${stage}`,
    outcomes: (counts: readonly string[]) => counts.join(" · "),
    count: (label: string, count: string) => `${label}: ${count}`,
    error: "Couldn’t save the change",
  },
};

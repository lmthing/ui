export const words = {
  turnLabels: { current: "Current turn", upcoming: "Up next", next: "Done, next", skip: "Skip" },
  turnHolder: (label: string, name: string) => `${label}: ${name}`,
  turnQueue: (names: string[]) => names.join(", "),
};

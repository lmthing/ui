export const words = {
  medicationLabels: {
    due: "Due",
    taken: "Taken",
    skipped: "Skipped",
    skip: "Skip",
    success: "All doses taken",
  },
  medicationStock: (count: string) => `${count} left`,
  medicationRefill: (names: readonly string[]) => `Refill: ${names.join(", ")}`,
  medicationReading: (name: string, time: string, status: string) => `${name}: ${time} · ${status}`,
};

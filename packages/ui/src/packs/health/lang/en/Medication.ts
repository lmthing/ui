export const words = {
  medicationLabels: {
    due: "Due",
    taken: "Taken",
    skipped: "Skipped",
    skip: "Skip",
    markTaken: "Mark taken",
    success: "All doses taken",
    empty: "No doses scheduled",
    unavailable: "Dose logging unavailable",
  },
  medicationAction: (action: string, name: string, time: string) => `${action}: ${name}, ${time}`,
  medicationStock: (count: string) => `${count} left`,
  medicationRefill: (names: readonly string[]) => `Refill: ${names.join(", ")}`,
  medicationReading: (name: string, time: string, dose: string, status: string) =>
    `${name}: ${time} · ${dose} · ${status}`,
};

export const words = {
  medicationLabels: {
    due: "Due",
    taken: "Logged as taken",
    skipped: "Skipped",
    skip: "Skip",
    markTaken: "Mark taken",
    success: "No more scheduled doses to log",
    empty: "No doses scheduled",
    notLogged: "Due · Not logged",
    unavailable: "Dose logging unavailable. Check your dose log before trying again.",
  },
  medicationAction: (action: string, name: string, time: string) => `${action}: ${name}, ${time}`,
  medicationStock: (count: string) => `${count} left`,
  medicationRefill: (names: readonly string[]) => `Low stock: ${names.join(", ")}`,
  medicationReading: (name: string, time: string, dose: string, status: string) =>
    `${name}: ${time} · ${dose} · ${status}`,
};

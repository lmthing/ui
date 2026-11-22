export const words = {
  bills: {
    month: "Monthly estimate",
    year: "Yearly total",
    separator: "\u00a0· ",
    due: (date: string) => `Due ${date}`,
    trialEnds: (date: string) => `Trial ends ${date}`,
    manage: "Manage",
    manageBill: (name: string) => `Manage ${name}`,
    overdue: (name: string) => `${name}, overdue`,
    markPaid: (name: string) => `Mark ${name} as paid`,
    repeat: {
      weekly: "Weekly",
      monthly: "Monthly",
      yearly: "Yearly",
    },
  },
};

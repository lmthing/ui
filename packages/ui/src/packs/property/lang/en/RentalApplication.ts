export const words = {
  applications: {
    empty: "No application loaded",
    success: "Decision saved",
    error: "Screening verification failed",
    note: "Decision note",
    waitlist: "Waitlist",
    approve: "Approve",
    decline: "Decline",
    decisions: {
      pending: "Decision pending",
      waitlisted: "Waitlisted",
      approved: "Approved",
      declined: "Declined",
    },
    ratio: "income to rent",
    ratioReading: (ratio: string) => `${ratio} income to rent`,
    multiple: (value: string) => `${value}×`,
    householdIncome: (value: string) => `${value} monthly household income`,
    monthlyRent: (value: string) => `${value} monthly rent`,
    moveIn: (date: string) => `Move-in · ${date}`,
    checks: "Screening checks",
    kinds: { credit: "Credit", background: "Background", income: "Income", refs: "References" },
    checksStatus: { pending: "Pending", passed: "Passed", flagged: "Flagged", missing: "Missing" },
    checkReading: (id: string, label: string, status: string, note?: string) =>
      [id, label, status, note].filter(Boolean).join(" · "),
  },
};

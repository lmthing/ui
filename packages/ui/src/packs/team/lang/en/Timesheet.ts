export const words = {
  timesheet: {
    hours: "Hours",
    empty: "No timesheet entries",
    punches: "Clock punches",
    noPunches: "No clock punches recorded",
    submit: "Submit timesheet",
    punchRange: (from: string, to: string) => `${from}–${to}`,
    openPunch: (from: string) => `${from} · Still open`,
    totalHours: (total: string) => `Total: ${total}`,
    overtimeHours: (overtime: string) => `Overtime: ${overtime}`,
    total: "Total",
    overtime: "Overtime",
    approval: "Status",
    approve: "Approve",
    approved: "Approved",
    noOvertime: "—",
    hoursValue: (value: string) => `${value} h`,
    dayReading: (day: string, value: string) => `${day} ${value}`,
    summaryReading: (total: string, overtime: string, status: string) =>
      `Total ${total} · Overtime ${overtime} · Status ${status}`,
    rowReading: (name: string, days: string[], summary: string[]) =>
      `${name}: ${[days.join(", "), ...summary].filter(Boolean).join(" · ")}`,
  },
};

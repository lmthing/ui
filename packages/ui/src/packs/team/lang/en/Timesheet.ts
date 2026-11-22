export const words = {
  timesheet: {
    hours: "Hours",
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

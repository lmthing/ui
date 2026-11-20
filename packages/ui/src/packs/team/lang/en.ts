export const en = {
  shiftStatus: {
    confirmed: "Confirmed",
    offered: "Offered",
    swap_requested: "Swap requested",
  },
  shiftActions: {
    swap: "Ask to swap",
    swapPending: "Request sent",
    offer: "Offer shift",
    offerPending: "Offer sent",
  },
  shiftTimeSeparator: "–",
  shiftCoworkers: (names: string) => ["With ", names] as const,
  openShift: {
    claim: "Claim",
    empty: "No open shifts",
    success: "Claim requested",
    detailSeparator: " · ",
  },
  timeClock: {
    shift: "Work shift",
    on: "On shift",
    off: "Off shift",
    onBreak: "On break",
    clockedOut: "Clocked out",
    clockIn: "Clock in",
    clockOut: "Clock out",
    startBreak: "Start break",
    endBreak: "End break",
    elapsed: "Time on shift",
    since: (time: string) => `Clocked in at ${time}`,
    breaks: (count: string, form: Intl.LDMLPluralRule) =>
      form === "one" ? `${count} break today` : `${count} breaks today`,
  },
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
  approval: {
    kinds: { time_off: "Time off", swap: "Shift swap", expense: "Expense", other: "Other request" },
    approve: "Approve",
    decline: "Decline",
    empty: "No pending requests",
    success: "Decision recorded",
    detailSeparator: " · ",
  },
};

export type TeamWords = typeof en;

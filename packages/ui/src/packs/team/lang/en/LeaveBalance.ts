export const words = {
  leaveBalance: {
    title: "Leave balance",
    empty: "No leave balances assigned",
    request: "Request time off",
    remaining: (accrued: string) => `Available from ${accrued} accrued`,
    accrualLabel: (cap?: string) => (cap ? `Accrued · ${cap} cap` : "Accrued"),
    used: "Used",
    pending: "Pending",
    labeled: (label: string, value: string) => `${label}: ${value}`,
    balance: (label: string, value: string) => `${label}: ${value} available`,
    expires: (date: string) => `Expires ${date}`,
    hours: (value: string) => `${value} h`,
    days: (value: string) => `${value} d`,
  },
};

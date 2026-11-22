export const words = {
  applications: {
    applied: (date: string) => `Applied ${date}`,
    contact: (date: string, ago?: string) => `Last contact ${date}${ago ? ` · ${ago}` : ""}`,
    daysAgo: (days: string, plural: Intl.LDMLPluralRule) =>
      `${days} ${plural === "one" ? "day" : "days"} ago`,
    nextAt: (date: string) => `By ${date}`,
    dueToday: "Due today",
    overdue: "Overdue",
    log: "Log follow-up",
    withdraw: "Withdraw application",
    remove: "Remove saved role",
    success: "Follow-up logged",
    error: "Couldn’t save the application",
  },
};

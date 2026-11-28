export const words = {
  approval: {
    kinds: {
      time_off: "Time off",
      swap: "Shift swap",
      expense: "Expense",
      other: "Other request",
      shift_claim: "Shift claim",
    },
    statuses: { pending: "Pending", approved: "Approved", declined: "Declined" },
    awaitingDecision: "Awaiting a decision",
    empty: "No requests yet",
    queueEmpty: "No requests awaiting a decision",
    approve: "Approve",
    decline: "Decline",
    declineQuestion: (title: string, from: string) => `Decline ${title} for ${from}?`,
    outcome: (title: string, status: string) => `${title}: ${status}`,
    success: "Decision recorded",
    detailSeparator: " · ",
  },
};

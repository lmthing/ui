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
    success: "Decision recorded",
    detailSeparator: " · ",
    review: {
      reason: "Reason (required to decline)",
      pending: "Recording decision…",
      failed: "Decision not recorded. Try again.",
      unavailable: "Decision details unavailable",
      totalLabel: "Total",
      total: (amount: string) => `Total ${amount}`,
    },
  },
};

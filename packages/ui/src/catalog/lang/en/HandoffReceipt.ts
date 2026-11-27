export const words = {
  handoffReceipt: {
    phases: { waiting: "Awaiting receipt", received: "Received", returned: "Returned" },
    from: "From",
    to: "To",
    open: "View record",
    openRecord: (subject: string) => `View record: ${subject}`,
  },
};

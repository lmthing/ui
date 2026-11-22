export const words = {
  received: (amount: string) => `Received ${amount}`,
  paymentDate: (date: string) => `Date ${date}`,
  paymentDue: (date: string) => `Due ${date}`,
  paymentLabels: {
    paid: "Paid",
    due: "Due",
    overdue: "Overdue",
    partial: "Part paid",
    mark: "Mark as paid",
    remind: "Remind",
    updated: "Update complete",
    link: "Scan to pay",
    copy: "Copy link",
    share: "Share link",
    installments: "Installment history",
  },
};

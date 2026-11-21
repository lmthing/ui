export const en = {
  signed: (date: string) => `Signed · ${date}`,
  since: (date: string) => `Client since ${date}`,
  next: (text: string) => `Next: ${text}`,
  received: (amount: string) => `Received ${amount}`,
  paymentDate: (date: string) => `Date ${date}`,
  paymentDue: (date: string) => `Due ${date}`,
  agreementLabels: { agree: "I agree", accepted: "Accepted", name: "Full name" },
  contactLabels: { call: "Call", message: "Message", directions: "Directions" },
  paymentLabels: {
    paid: "Paid",
    due: "Due",
    overdue: "Overdue",
    partial: "Part paid",
    mark: "Mark as paid",
    remind: "Remind",
    updated: "Update complete",
  },
};

export type CustomersWords = typeof en;

export const words = {
  since: (date: string) => `Client since ${date}`,
  next: (text: string) => `Next: ${text}`,
  contactLabels: { call: "Call", message: "Message", directions: "Directions", email: "Email" },
  clientBalance: {
    due: (amount: string) => `Owes ${amount}`,
    credit: (amount: string) => `${amount} credit`,
    settled: "No balance due",
  },
};

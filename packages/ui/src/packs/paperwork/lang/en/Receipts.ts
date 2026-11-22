export const words = {
  receipts: {
    allocation: (percent: string) => `Assigned ${percent}`,
    attached: "Receipt attached",
    privateFile: "(private file)",
    unavailable: "Receipt attachment unavailable",
    review: (payee: string) => `Review receipt from ${payee}`,
    remove: (payee: string) => `Remove receipt from ${payee}`,
    separator: " · ",
  },
};

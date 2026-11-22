export const words = {
  cardControls: {
    network: { debit: "Debit", credit: "Credit", ebt: "EBT", prepaid: "Prepaid" },
    last4: (digits: string) => `•••• ${digits}`,
    expires: (date: string) => `Expires ${date}`,
    freeze: "Freeze card",
    online: "Online purchases",
    atm: "ATM withdrawals",
    international: "Spending abroad",
    spendCap: "Per-purchase limit",
    reveal: "Unlock card details",
    updated: "Card settings updated",
    error: "Couldn’t sync card settings",
  },
};

export const en = {
  dues: {
    assessed: "Assessed",
    collected: "Collected",
    outstanding: "Outstanding",
    due: (date: string) => `Due ${date}`,
    paid: (amount: string) => `${amount} paid`,
    balance: (amount: string) => `${amount} outstanding`,
    credit: (amount: string) => `${amount} credit`,
    receipt: (member: string, id: string) => `${member} · ${id}`,
    separator: " · ",
    status: { paid: "Paid", partial: "Part paid", unpaid: "Unpaid", overdue: "Overdue" },
    method: { cash: "Cash", transfer: "Transfer", card: "Card" },
    voided: "Voided",
    saved: "Receipt recorded",
    error: "Could not save the payment",
    record: "Record",
    remind: "Remind",
    pay: "Pay dues",
    void: "Void",
  },
  members: {
    voting: { yes: "Can vote", no: "No voting rights" },
    joined: (date: string) => `Joined ${date}`,
    ended: (date: string) => `Left ${date}`,
    dues: { paid: "Dues paid", owed: "Dues due" },
    end: "End membership",
    saved: "Membership ended",
    error: "Could not end membership",
  },
};

export type CommunityWords = typeof en;

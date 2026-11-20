export const en = {
  shiftStatus: {
    confirmed: "Confirmed",
    offered: "Offered",
    swap_requested: "Swap requested",
  },
  shiftActions: {
    swap: "Ask to swap",
    swapPending: "Request sent",
    offer: "Offer shift",
    offerPending: "Offer sent",
  },
  shiftTimeSeparator: "–",
  shiftCoworkers: (names: string) => ["With ", names] as const,
  openShift: {
    claim: "Claim",
    empty: "No open shifts",
    success: "Claim requested",
    detailSeparator: " · ",
  },
};

export type TeamWords = typeof en;

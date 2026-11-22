export const words = {
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
};

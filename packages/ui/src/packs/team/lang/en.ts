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
  timeClock: {
    shift: "Work shift",
    on: "On shift",
    off: "Off shift",
    onBreak: "On break",
    clockedOut: "Clocked out",
    clockIn: "Clock in",
    clockOut: "Clock out",
    startBreak: "Start break",
    endBreak: "End break",
    elapsed: "Time on shift",
    since: (time: string) => `Clocked in at ${time}`,
    breaks: (count: string, form: Intl.LDMLPluralRule) =>
      form === "one" ? `${count} break today` : `${count} breaks today`,
  },
};

export type TeamWords = typeof en;

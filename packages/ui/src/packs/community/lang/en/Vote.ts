export const words = {
  vote: {
    phase: {
      scheduled: "Voting scheduled",
      open: "Voting open",
      closed: "Voting closed",
      cancelled: "Motion cancelled",
    },
    rule: { majority: "Simple majority", two_thirds: "Two-thirds majority", unanimous: "Unanimous consent" },
    decision: { passed: "Motion passed", failed: "Motion did not pass", noQuorum: "Quorum not reached" },
    choice: { for: "For", against: "Against", abstain: "Abstain" },
    opens: (date: string) => `Opens ${date}`,
    closes: (date: string) => `Closes ${date}`,
    quorum: "Quorum",
    participation: (count: string, target: string) => [
      { number: count },
      " of ",
      { number: target },
      " cast",
    ],
    own: (choice: string) => `Your ballot: ${choice}`,
    recorded: (choice: string) => `Ballot on record: ${choice}`,
    count: (choice: string, count: string) => `${choice}: ${count}`,
    cancel: "Cancel motion",
    saved: "Ballot saved",
    error: "Could not save your ballot",
  },
};

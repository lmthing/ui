export const words = {
  rewardLabels: {
    units: { one: "point", other: "points" },
    heading: "Rewards",
    claim: "Claim",
    unavailable: "Unavailable",
    success: "Prize claimed",
  },
  rewardPoints: (value: string, unit: string) => `${value} ${unit}`,
  rewardEntry: (name: string, amount: string) => `${name}: ${amount}`,
  rewardNeeds: (amount?: string) => (amount ? `Needs ${amount} more` : "Needs more"),
  rewardPrizeStatus: (line: string, reason: string) => `${line} · ${reason}`,
};

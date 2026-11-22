export const words = {
  scoreLabels: {
    title: "Score sheet",
    player: "Player",
    total: "Total",
    rounds: "Rounds",
    unplayed: "—",
    bid: (value: string) => `Bid ${value}`,
    made: "Made",
    target: "Target: ",
    reached: (names: readonly string[]) => `Reached by ${names.join(", ")}`,
    reset: "Reset scores",
    share: "Share scores",
  },
  scoreProgress: (done: string, count: string, plural: Intl.LDMLPluralRule) =>
    `${done} of ${count} ${plural === "one" ? "round" : "rounds"} complete`,
  scorePlace: (rank: string) => `Rank ${rank}`,
  scoreWinner: "Winner",
  scoreTie: "Tied winner",
  scoreCell: (player: string, round: string, metric?: string) =>
    `${player}, ${round}${metric ? `, ${metric}` : ""}`,
  scoreReadCell: (player: string, round: string, points: string) => `${player}, ${round}: ${points}`,
};

export const words = {
  bracket: {
    title: "Knockout bracket",
    winner: (team: string) => `${team} wins`,
    side: (team: string, score: string) => `${team} ${score}`,
    tie: (id: string, round: string, a: string, b: string) => `${id}: ${round}, ${a} · ${b}`,
    outcome: (tie: string, winner: string) => `${tie} · ${winner}`,
  },
};

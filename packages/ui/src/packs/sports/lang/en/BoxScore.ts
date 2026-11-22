export const words = {
  boxScore: {
    title: "Box score",
    team: "Team",
    players: "Player",
    total: "Total",
    period: "Period",
    columns: ["A", "B", "C"],
    switchTeam: "Choose team",
    empty: "The box score has not been recorded yet.",
    scorePair: (home: string, away: string) => `${home}–${away}`,
    teams: (home: string, away: string) => `${home} · ${away}`,
    score: (period: string, home: string, h: string, away: string, a: string) =>
      `${period}: ${home} ${h}, ${away} ${a}`,
    selected: (team: string) => `Player statistics: ${team}`,
    stat: (column: string, value: string) => `${column} ${value}`,
    player: (id: string, name: string, pos: string | undefined, stats: string[]) =>
      `${id}: ${name}${pos ? ` (${pos})` : ""} · ${stats.join(", ")}`,
  },
};

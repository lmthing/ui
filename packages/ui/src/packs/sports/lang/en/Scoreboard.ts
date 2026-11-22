export const words = {
  scoreboard: {
    status: { upcoming: "Not started", live: "Live", break: "Half time", final: "Full time" },
    score: (home: string, homeScore: string, awayScore: string, away: string) =>
      `${home} ${homeScore}–${awayScore} ${away}`,
    add: (team: string) => `Add a goal for ${team}`,
    undo: (team: string) => `Undo a goal for ${team}`,
    start: "Start clock",
    stop: "Stop clock",
    sports: {
      football: "Football",
      basketball: "Basketball",
      baseball: "Baseball / softball",
      tennis: "Tennis",
      hockey: "Hockey",
      generic: "Match",
    },
    periods: "Score by period",
    periodScore: (home: string, away: string) => `${home}–${away}`,
    periodLine: (label: string, score: string) => `${label}: ${score}`,
    possession: (team: string) => `Possession: ${team}`,
    count: (kind: "outs" | "balls" | "strikes", value: string) =>
      `${{ outs: "Outs", balls: "Balls", strikes: "Strikes" }[kind]}: ${value}`,
    baseNames: { first: "first", second: "second", third: "third" },
    bases: (occupied: string[]) => (occupied.length ? `Runners on ${occupied.join(", ")}` : "Bases empty"),
  },
};

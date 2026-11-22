export const words = {
  scoreboard: {
    status: { upcoming: "Not started", live: "Live", break: "Half time", final: "Full time" },
    score: (home: string, homeScore: string, awayScore: string, away: string) =>
      `${home} ${homeScore}–${awayScore} ${away}`,
    add: (team: string) => `Add a goal for ${team}`,
    undo: (team: string) => `Undo a goal for ${team}`,
    start: "Start clock",
    stop: "Stop clock",
  },
};

export const en = {
  turnOrder: {
    current: "Current turn",
    complete: "Game complete",
    lastPlayer: (name: string) => `Last turn: ${name}`,
    forward: "Forward",
    reverseDirection: "Reverse",
    lap: (lap: string, direction: string) => `Lap ${lap} · ${direction}`,
    boundedLap: (lap: string, limit: string, direction: string) => `Lap ${lap} of ${limit} · ${direction}`,
    next: "Next turn",
    skip: "Skip turn",
    reverse: "Reverse order",
    restart: "Restart",
  },
  scoreLabels: {
    title: "Score sheet",
    player: "Player",
    total: "Total",
    rounds: "Rounds",
    unplayed: "—",
    notPlayed: "Not played",
    reset: "Reset scores",
    share: "Share scores",
  },
  scoreProgress: (done: string, count: string, plural: Intl.LDMLPluralRule) =>
    `${done} of ${count} ${plural === "one" ? "round" : "rounds"} complete`,
  scorePlace: (rank: string) => `Rank ${rank}`,
  scoreWinner: "Winner",
  scoreTie: "Tied winner",
  scoreCell: (player: string, round: string) => `${player}, ${round}`,
  scoreReadCell: (id: string, player: string, round: string, points: string) =>
    `${id} ${player}, ${round}: ${points}`,
  dice: {
    one: (count: string, sides: string) => `${count} die · ${sides} sides`,
    other: (count: string, sides: string) => `${count} dice · ${sides} sides`,
    roll: "Roll dice",
    reroll: "Roll again",
    unrolled: "Ready to roll",
    sum: (total: string) => `Total ${total}`,
    blankFace: (position: string) => `Die ${position}, not rolled`,
    face: (position: string, value: string) => `Die ${position}, showing ${value}`,
    heldFace: (position: string, value: string) => `Die ${position}, showing ${value}, held`,
  },
  spinner: {
    pool: "Draw pool",
    empty: "Nothing drawn yet",
    ready: "Ready to spin",
    result: "Selected at random",
    exhausted: "No options left",
    remaining: (count: string, plural: Intl.LDMLPluralRule) =>
      `${count} ${plural === "one" ? "option" : "options"} left`,
    spin: "Spin",
    again: "Spin again",
    reset: "Reset options",
  },
};

export type PlayWords = typeof en;

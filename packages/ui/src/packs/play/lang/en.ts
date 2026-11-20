export const en = {
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
  trivia: {
    emptyThing: "trivia question",
    points: (value: string, plural: Intl.LDMLPluralRule) =>
      `${value} ${plural === "one" ? "point" : "points"}`,
    photo: "Question photo",
    reveal: "Reveal answer",
    next: "Next question",
    restart: "Restart",
  },
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
};

export type PlayWords = typeof en;

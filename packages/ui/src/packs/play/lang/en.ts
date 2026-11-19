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

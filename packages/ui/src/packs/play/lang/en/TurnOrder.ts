export const words = {
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
};

export const words = {
  cardDeck: {
    ready: "No cards drawn yet",
    remaining: (count: string) => `Draw pile: ${count}`,
    discarded: (count: string) => `Discard pile: ${count}`,
    draw: "Draw cards",
    reshuffle: "Reshuffle deck",
    exhausted: "The draw pile is empty",
  },
};

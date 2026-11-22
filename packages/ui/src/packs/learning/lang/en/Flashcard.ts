export const words = {
  flashcard: {
    empty: "No cards due",
    left: (count: string, category: Intl.LDMLPluralRule) =>
      `${count} ${category === "one" ? "card" : "cards"} left`,
    reveal: "Reveal answer",
    again: "Again",
    hard: "Hard",
    good: "Good",
    easy: "Easy",
    know: "Know",
    stillLearning: "Still learning",
    complete: "Done for today",
  },
  promptAudio: { play: "Play audio", pause: "Pause audio", unavailable: "Audio unavailable" },
};

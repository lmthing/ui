export type LearningWords = {
  flashcard: {
    left: (count: string, category: Intl.LDMLPluralRule) => string;
    reveal: string;
    again: string;
    hard: string;
    good: string;
    easy: string;
    complete: string;
  };
};

export const en = {
  flashcard: {
    left: (count, category) => `${count} ${category === "one" ? "card" : "cards"} left`,
    reveal: "Reveal answer",
    again: "Again",
    hard: "Hard",
    good: "Good",
    easy: "Easy",
    complete: "Done for today",
  },
} satisfies LearningWords;

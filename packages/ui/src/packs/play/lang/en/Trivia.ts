export const words = {
  trivia: {
    emptyThing: "trivia question",
    points: (value: string, plural: Intl.LDMLPluralRule) =>
      `${value} ${plural === "one" ? "point" : "points"}`,
    photo: "Question photo",
    choices: "Choices",
    reveal: "Reveal answer",
    next: "Next question",
    restart: "Restart",
  },
};

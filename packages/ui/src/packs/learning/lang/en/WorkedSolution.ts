export const words = {
  workedSolution: {
    photo: "Photo of the problem",
    next: "Next step",
    all: "Show all steps",
    work: "Calculation",
    answer: "Final answer",
    copy: "Copy answer",
    copied: "Answer copied",
    tutor: "Ask a tutor",
    solve: "Request another solution",
    empty: "No problem to solve yet",
    error: "This problem could not be read.",
    success: "All steps revealed",
    stepTitle: (step: string, title: string) => `${step}. ${title}`,
    answerReading: (answer: string) => `Final answer: ${answer}`,
    solver: {
      pending: "Requesting a solution…",
      accepted: "Solution request accepted.",
      rejected: "Could not request a solution.",
      cancelled: "Solution request cancelled.",
    },
  },
};

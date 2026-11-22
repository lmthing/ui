export const words = {
  pipeline: {
    move: "Move to",
    destination: (stage: string, name: string) => `Move ${name} to ${stage}`,
    outcomes: (counts: readonly string[]) => counts.join(" · "),
    count: (label: string, count: string) => `${label}: ${count}`,
    countLabel: (label: string) => `${label}: `,
    separator: " · ",
    emptyStage: "No applicants",
    thing: "applicant",
    error: "Couldn’t save the stage change",
  },
};

export const words = {
  squad: {
    available: "Available to play",
    reply: "Your availability",
    answers: { yes: "yes", maybe: "maybe", no: "no", none: "No reply" },
    selection: (name: string) => `Pick ${name}`,
    picked: "Picked",
    separator: " · ",
    row: (name: string, answer: string) => `${name}: ${answer}`,
  },
};

export const words = {
  lineup: {
    title: "Starting lineup",
    bench: "Substitutes",
    separator: "–",
    player: (name: string, number: string) => `${name}, shirt ${number}`,
    read: (id: string, name: string, number: string) => `${id}: ${name} #${number}`,
    rating: (value: string) => `Rating ${value}`,
    cards: { yellow: "Yellow card", red: "Red card" },
    goals: (value: string, singular: boolean) => `${value} ${singular ? "goal" : "goals"}`,
    badgeSeparator: " · ",
  },
};

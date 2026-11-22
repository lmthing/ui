export const words = {
  lineup: {
    title: "Starting lineup",
    bench: "Substitutes",
    separator: "–",
    player: (name: string, number: string) => `${name}, shirt ${number}`,
    read: (id: string, name: string, number: string) => `${id}: ${name} #${number}`,
  },
};

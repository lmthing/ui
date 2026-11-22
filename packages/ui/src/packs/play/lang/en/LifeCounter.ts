export const words = {
  lifeCounter: {
    lifeLine: (name: string, total: string) => `${name}: ${total} life`,
    counterLine: (label: string, value: string) => `${label}: ${value}`,
    life: "Life",
    step: (gain: boolean, amount: string) => `${gain ? "+" : "−"}${amount}`,
    adjust: (name: string, label: string, step: string) => `${name}, ${label}, ${step}`,
    winner: (name: string) => `${name} wins`,
    complete: "Match complete",
    reset: "Reset match",
  },
};

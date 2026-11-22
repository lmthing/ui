export const words = {
  buzzerPad: {
    waiting: "Ready to buzz",
    tap: "Tap to buzz",
    first: "First",
    winner: (name: string) => `${name} buzzed first`,
    delta: (time: string) => `${time} ms later`,
    reset: "Reset buzzer",
  },
};

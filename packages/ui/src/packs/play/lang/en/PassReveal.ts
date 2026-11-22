export const words = {
  passReveal: {
    prompt: "Pass the phone to this player",
    reveal: "Reveal your role",
    hold: "Hold to reveal",
    release: "Release to hide and pass",
    hide: "Hide and pass",
    progress: (at: string, count: string) => `Player ${at} of ${count}`,
    empty: "Add at least three players to start",
    ready: "Round ready",
    restart: "Restart round",
  },
};

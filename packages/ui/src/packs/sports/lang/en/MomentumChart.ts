export const words = {
  momentumChart: {
    title: { win_prob: "Win probability", momentum: "Match momentum" },
    empty: "The match momentum feed is unavailable.",
    even: "Even",
    advantage: (name: string, delta: string, mode: "win_prob" | "momentum") =>
      `${name} +${delta}${mode === "win_prob" ? " pp" : ""}`,
    current: (clock: string, value: string, advantage: string) => `${clock} · ${value} · ${advantage}`,
    event: (id: string, clock: string, value: string, name?: string) =>
      `${id}: ${clock} · ${value}${name ? ` · ${name}` : ""}`,
  },
};

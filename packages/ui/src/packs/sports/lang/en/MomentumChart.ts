export const words = {
  momentumChart: {
    title: { win_prob: "Win probability", momentum: "Match momentum" },
    empty: "The match momentum feed is unavailable.",
    even: "Even",
    advantage: (name: string, delta: string, mode: "win_prob" | "momentum") =>
      `${name} +${delta}${mode === "win_prob" ? " pp" : ""}`,
    teams: (home: string, away: string) => `${home} vs ${away}`,
    homeSeries: (home: string) => `${home} (home)`,
    scale: (low: string, high: string, baseline: string) =>
      low === high ? `${baseline} = even` : `${low} to ${high} · ${baseline} = even`,
    latest: (clock: string, advantage: string) => `${clock} · ${advantage}`,
    at: (clock: string, value: string) => `${clock} · ${value}`,
    selected: (id: string) => `Selected event: ${id}`,
    current: (clock: string, value: string, advantage: string) => `${clock} · ${value} · ${advantage}`,
    event: (id: string, clock: string, value: string, name?: string) =>
      `${id}: ${clock} · ${value}${name ? ` · ${name}` : ""}`,
  },
};

export const words = {
  babyLabels: {
    feed_left: "Feed left",
    feed_right: "Feed right",
    bottle: "Bottle",
    nappy: "Nappy",
    sleep: "Sleep",
    none: "None running",
  },
  babyLog: {
    title: "Today’s log",
    history: "History",
    empty: "No entries yet",
    running: (label: string) => `${label} running`,
    last: (time?: string) => (time ? `Last ${time}` : "—"),
  },
};

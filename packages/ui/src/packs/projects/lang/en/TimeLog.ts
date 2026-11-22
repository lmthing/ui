export const words = {
  timeLog: {
    week: (date: string) => `Week of ${date}`,
    weekTotal: "Week total",
    start: "Start timer",
    stop: "Stop and save",
    discard: "Discard timer",
    add: "Add entry",
    export: "Export week",
    remove: (title: string) => `Remove ${title}`,
    saved: "Entry saved",
    billable: "Billable",
    nonBillable: "Non-billable",
    duration: (hours: string, minutes: string, seconds: string) =>
      [hours && `${hours}h`, minutes && `${minutes}m`, seconds && `${seconds}s`].filter(Boolean).join(" "),
    range: " – ",
    separator: " · ",
  },
};

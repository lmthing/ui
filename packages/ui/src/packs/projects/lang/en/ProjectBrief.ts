export const words = {
  projectBrief: {
    resources: "Resources",
    edit: "Edit brief",
    empty: "No project brief yet",
    owner: (name: string) => `Owner: ${name}`,
    start: (date: string) => `Starts ${date}`,
    target: (date: string) => `Target: ${date}`,
    window: (start: string, target: string) => `Delivery: ${start} – ${target}`,
    section: (heading: string, body: string) => `${heading}: ${body}`,
    open: (label: string) => `Open ${label} in browser`,
  },
};

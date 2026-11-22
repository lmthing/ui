export const words = {
  scope: {
    revision: (revision: string) => `Revision ${revision}`,
    count: (count: string, total: string) => `${count} of ${total}`,
    accepted: (count: string) => `${count} accepted`,
    acceptedLabel: "Deliverables accepted",
    due: (date: string) => `Due ${date}`,
    overdue: (date: string) => `Overdue · ${date}`,
    acceptedAt: (date: string) => `Accepted ${date}`,
    complete: "All deliverables accepted",
    excluded: "Out of scope",
    accept: (title: string) => `Accept ${title}`,
    clear: (title: string) => `Clear acceptance of ${title}`,
    remove: (title: string) => `Remove ${title}`,
    openMark: "→",
    separator: " · ",
  },
};

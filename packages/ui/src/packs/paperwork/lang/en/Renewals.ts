export const words = {
  renewals: {
    due: (date: string) => `Ends ${date}`,
    notice: (date: string) => `Notice by ${date}`,
    completed: (date: string) => `Completed ${date}`,
    completedUndated: "Completed",
    overdue: "Overdue",
    dueToday: "Action due today",
    dueIn: (days: string) => `Action due in ${days}`,
    success: "All renewals completed",
    remind: (title: string) => `Set a reminder for ${title}`,
    check: (title: string) => `Mark ${title} completed`,
    remove: (title: string) => `Remove ${title} from the tracker`,
  },
};

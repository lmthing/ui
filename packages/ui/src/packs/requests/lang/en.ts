import type { LDMLPluralRule } from "../../../catalog";

export const en = {
  queue: {
    views: { active: "Active", completed: "Completed" },
    viewLabel: "Request view",
    status: {
      new: "New",
      queued: "Queued",
      working: "In progress",
      waiting: "Waiting",
      resolved: "Resolved",
      closed: "Closed",
    },
    urgency: { low: "Low", normal: "Normal", urgent: "Urgent" },
    count: (count: string, form: LDMLPluralRule) => `${count} ${form === "one" ? "request" : "requests"}`,
    more: (count: string) => `and ${count} more`,
    empty: { active: "No active requests", completed: "No completed requests" },
    error: "Could not load requests",
    retry: "Try again",
    age: (count: string, unit: "minute" | "hour" | "day", form: LDMLPluralRule) =>
      `${count} ${unit}${form === "one" ? "" : "s"} old`,
    justOpened: "Just opened",
    assignee: (who: string) => `Assigned to ${who}`,
    deadline: (date: string, time?: string) => (time ? `${date}, ${time}` : date),
    due: (date: string) => `Due ${date}`,
    overdue: (date: string) => `Overdue · ${date}`,
    separator: " · ",
  },
};

export type RequestsWords = typeof en;

export const en = {
  thread: {
    heading: (number: string) => `Request ${number}`,
    audience: "Who can see this?",
    audiences: { requester: "To requester", internal: "Keep internal" },
    field: "Write a reply",
    send: "Send reply",
    sent: "Reply sent",
    failed: "Reply not sent",
    photo: "Attached photo",
    events: { status: "Status changed", assignment: "Assignment changed", work: "Work order linked" },
    statuses: {
      new: "New",
      queued: "Queued",
      working: "In progress",
      waiting: "Waiting",
      resolved: "Resolved",
      closed: "Closed",
    },
    statusChange: (from: string, to: string) => `${from} → ${to}`,
    assignee: (who: string) => `Assigned to ${who}`,
  },
};

export type RequestsWords = typeof en;

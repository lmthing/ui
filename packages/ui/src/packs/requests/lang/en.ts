const scope = { one: "one affected", several: "several affected", site: "whole site" };

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
  triage: {
    reported: (urgency: "low" | "normal" | "urgent") => `Reported urgency: ${urgency}`,
    impact: (value: keyof typeof scope) => `Impact: ${scope[value]}`,
    urgency: { low: "low", normal: "normal", urgent: "urgent" },
    priority: "Effective priority",
    decision: "Triage decision · Effective priority",
    queue: "Route to queue",
    duplicates: "Match to an existing request",
    reason: "Decision reason",
    reasonHint: "Add context for this decision",
    linkHint: "Required to link a duplicate",
    link: "Link",
    chosen: "Link selected",
    apply: "Apply triage",
    saved: "Triage saved",
    error: "Triage not saved",
    stale: "The queue or duplicate may have changed.",
    selected: (target: string) => `Selected: ${target}; apply to save`,
  },
};

export type RequestsWords = typeof en;

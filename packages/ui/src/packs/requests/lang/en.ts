const scope = { one: "one affected", several: "several affected", site: "whole site" };

export const en = {
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

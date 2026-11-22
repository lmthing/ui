export const words = {
  candidate: {
    applied: (date: string) => `Applied ${date}`,
    findings: { unreviewed: "Unreviewed", needs_evidence: "Needs evidence", meets: "Meets", gap: "Gap" },
    evidence: "Add evidence",
    evidenceFor: (criterion: string) => `Evidence for ${criterion}`,
    reviewLine: (criterion: string, finding: string) => `${criterion}: ${finding}`,
    interview: "Interview",
    offer: "Offer",
    panel: "Interviewer findings",
    resume: "View résumé",
    history: { interview: "View interview", offer: "View offer" },
    hire: "Record hire",
    reject: "Reject",
    withdraw: "Withdraw",
    success: "Decision recorded",
    error: "Couldn’t save the decision",
  },
};

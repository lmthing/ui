export const en = {
  stages: {
    saved: "Saved",
    applied: "Applied",
    screening: "Screening",
    interview: "Interview",
    offer: "Offer",
  },
  outcomes: { active: "Active", hired: "Hired", rejected: "Rejected", withdrawn: "Withdrawn" },
  candidate: {
    applied: (date: string) => `Applied ${date}`,
    findings: { unreviewed: "Unreviewed", needs_evidence: "Needs evidence", meets: "Meets", gap: "Gap" },
    evidence: "Add evidence",
    evidenceFor: (criterion: string) => `Evidence for ${criterion}`,
    reviewLine: (criterion: string, finding: string) => `${criterion}: ${finding}`,
    interview: "Interview",
    offer: "Offer",
    history: { interview: "View interview", offer: "View offer" },
    hire: "Record hire",
    reject: "Reject",
    withdraw: "Withdraw",
    success: "Decision recorded",
    error: "Couldn’t save the decision",
  },
};

export type HiringWords = typeof en;

export const words = {
  slaPolicy: {
    policy: "SLA rules",
    response: "First response",
    resolution: "Resolution",
    pending: "Pending",
    met: "Target met",
    breached: "Target missed",
    paused: "Paused",
    remaining: (time: string) => `${time} left`,
    success: "Both targets met",
    error: "SLA breached",
  },
};

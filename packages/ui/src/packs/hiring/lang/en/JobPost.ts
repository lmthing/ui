export const words = {
  jobPost: {
    workplace: { onsite: "On-site", hybrid: "Hybrid", remote: "Remote" },
    contract: { permanent: "Permanent", fixed_term: "Fixed-term", casual: "Casual", volunteer: "Volunteer" },
    termSeparator: " · ",
    payRange: (min: string, max: string) => `${min}–${max}`,
    requirements: "Requirements",
    requirement: (text: string) => `• ${text}`,
    closes: (date: string) => `Apply by ${date}`,
    closed: (date: string) => `Applications closed ${date}`,
    save: "Save job",
    apply: "Open application",
    publish: "Employer: publish post",
    success: "Job post updated",
    error: "Couldn’t publish the job post",
  },
};

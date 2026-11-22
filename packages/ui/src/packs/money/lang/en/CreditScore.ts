export const words = {
  creditScore: {
    label: "Credit score",
    scale: "Credit score range",
    factors: "What affects your score",
    rating: { excellent: "Excellent", good: "Good", fair: "Fair", poor: "Poor" },
    impact: { high: "High impact", medium: "Medium impact", low: "Low impact" },
    updated: (bureau: string, date: string) => `${bureau} · Updated ${date}`,
    change: (delta: string) => `${delta} since your last report`,
    empty: "No credit report available",
    error: "Couldn’t reach the credit bureau",
    refresh: "Refresh score",
  },
};

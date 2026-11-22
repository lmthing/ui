export const words = {
  teamNotice: {
    priority: { info: "Notice", important: "Important", urgent: "Urgent" },
    ack: "I’ve read this notice",
    acknowledged: "Acknowledged",
    success: "Read receipt recorded",
    count: (read: string, total: string) => `${read} of ${total} read`,
    countPieces: (count: string) =>
      (count.match(/\p{Nd}+|[^\p{Nd}]+/gu) ?? []).map((text) => ({ text, figure: /^\p{Nd}/u.test(text) })),
    unread: (value: string) => `${value} unread`,
  },
};

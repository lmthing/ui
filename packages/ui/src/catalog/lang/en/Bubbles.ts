export const words = {
  bubbleLabels: {
    status: { sent: "Sent", delivered: "Delivered", read: "Read" },
    attachment: { photo: "Photo", voice: "Voice message", file: "File" },
    broadcast: "Broadcast",
    reply: (value: string) => `Reply to: ${value}`,
  },
};

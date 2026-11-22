export const words = {
  request: {
    priority: { low: "Low priority", normal: "Normal priority", urgent: "Urgent" },
    status: { new: "New", booked: "Booked", fixed: "Fixed" },
    statusLabel: "Repair status",
    assignee: (name: string) => `Assigned to ${name}`,
    photo: "Repair photo",
    updates: "Updates",
    update: "Write a brief update",
  },
};

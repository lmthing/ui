export const words = {
  interview: {
    status: { proposed: "Proposed", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled" },
    format: { in_person: "In person", phone: "Phone", video: "Video call" },
    duration: (minutes: string) => `${minutes} min`,
    timeRange: (start: string, end: string) => `${start}–${end}`,
    nextDay: (time: string) => `${time} next day`,
    interviewers: (names: string) => `With ${names}`,
    past: "Meeting date passed",
    link: "Call link added",
    actions: {
      edit: "Edit interview",
      invite: "Send invite",
      join: "Join call",
      complete: "Mark complete",
      cancel: "Cancel interview",
    },
    success: "Interview updated",
    error: "Couldn’t update the interview",
  },
};

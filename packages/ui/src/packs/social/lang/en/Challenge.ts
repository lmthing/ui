import type { SocialWords } from "..";

export const words = {
  challenge: {
    amount: (value, unit) => `${value} ${unit}`,
    progress: (total, goal, unit) => `${total} ${goal} ${unit}`,
    group: "Group progress",
    goal: (amount) => `Goal: ${amount}`,
    mine: (amount) => `Your contribution: ${amount}`,
    deadline: (date) => `Deadline: ${date}`,
    daysLeft: (days, form) => `${days} ${form === "one" ? "day" : "days"} left`,
    endsToday: "Ends today",
    ended: "Challenge ended",
    reached: "Goal reached",
    top: "Top contributors",
    leader: (name, amount) => `${name}, ${amount}`,
    join: "Join challenge",
    log: "Log contribution",
  },
} satisfies Pick<SocialWords, "challenge">;

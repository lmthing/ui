export const words = {
  members: {
    voting: { yes: "Can vote", no: "No voting rights" },
    joined: (date: string) => `Joined ${date}`,
    ended: (date: string) => `Left ${date}`,
    dues: { paid: "Dues paid", owed: "Dues due" },
    committee: (name: string) => `Committee: ${name}`,
    end: "End membership",
    saved: "Membership ended",
    error: "Could not end membership",
  },
};

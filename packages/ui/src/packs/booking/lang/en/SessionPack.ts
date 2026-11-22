export const words = {
  sessionPack: {
    balance: "Credits remaining",
    remaining: (count: string) => `${count} left`,
    expiry: (date: string) => `Expires ${date}`,
    expiring: (date: string) => `Expires soon · ${date}`,
    expired: (date: string) => `Expired ${date}`,
    redeem: "Redeem session",
    renew: "Renew pack",
    success: "Session redeemed",
    expiredError: "This pack has expired",
    exhausted: "No credits left",
    error: "Couldn’t redeem session",
  },
};

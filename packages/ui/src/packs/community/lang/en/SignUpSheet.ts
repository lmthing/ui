export const words = {
  signUp: {
    capacity: (claimed: string, total: string) => `${claimed}/${total}`,
    remaining: (count: string, form: Intl.LDMLPluralRule) =>
      `${count} ${form === "one" ? "place" : "places"} left`,
    full: "Full",
    noClaimants: "No one signed up yet",
    claim: "Claim a place",
    release: "Release my place",
    saved: "Sign-up saved",
    error: "Could not update your sign-up.",
    separator: " · ",
  },
};

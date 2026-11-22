export const words = {
  registry: {
    claim: "Claim",
    release: "Release",
    claimed: "Claimed",
    available: "Available",
    success: "Gift claimed",
    released: "Gift released",
    owner: (name: string) => ` by ${name}`,
    reading: (item: string, fields: readonly string[]) => `${item}: ${fields.join(" · ")}`,
  },
};

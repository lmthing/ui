export const agreementLabels = { agree: "I agree", accepted: "Accepted", name: "Full name" } as const;

/** Keep the stored signing date visible without inventing a date for an unsigned record. */
export const agreementDateLine = (date: string): string => `Signed · ${date}`;

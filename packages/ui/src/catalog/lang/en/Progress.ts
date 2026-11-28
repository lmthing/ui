export const words = {
  progressUnavailable: "No progress recorded",
  progressDue: (date: string) => `Due ${date}`,
  progressRemaining: (amount: string, unit: string) => `${amount} ${unit} remaining`,
};

export const progressLoadFailed = "Couldn’t load progress";
export const progressOverTarget = (amount: string) => `Over by ${amount}`;
export const progressViewDetails = "View details";

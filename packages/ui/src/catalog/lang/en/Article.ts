export const words = {
  article: {
    byline: (name: string) => `By ${name}`,
    readingTime: (minutes: string) => `${minutes} min read`,
    metadataSeparator: " · ",
    bullet: "• ",
    ordinal: (number: string) => `${number}. `,
    quote: ["“", "”"] as [string, string],
    callout: "Note: ",
  },
};

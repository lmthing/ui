export const words = {
  feelings: {
    title: "Name what you feel",
    hint: "Choose a family, then pick words that fit.",
    families: "Feeling families",
    remaining: (count: string) => `remaining ${count}`,
    noWords: "No additional words in this family.",
    placeholder: (item: string, option: string) => `${item} · ${option}`,
  },
};

export const words = {
  careLabels: {
    categorySeparator: " · ",
    last: "Last",
    next: "Next",
    today: "Due today",
    overdue: "Late",
    noNext: "No next date",
    done: "Log done",
    success: "Care logged",
  },
  careCategory: { pet: "Pet care", plant: "Plant care", car: "Car care", house: "House care" },
  careDate: (label: string, date: string) => `${label} ${date.replace(/ /g, "\u00a0")}`,
};

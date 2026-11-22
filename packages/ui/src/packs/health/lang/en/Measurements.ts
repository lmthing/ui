export const words = {
  measurementChange: (value: string, unit: string) => `${value} ${unit} since first reading`,
  measurementGoal: (value: string, unit: string) => `Goal ${value} ${unit}`,
  measurementValue: (value: string, unit: string) => `${value} ${unit}`,
  measurementLabels: {
    add: "Add measurement",
    ranges: "Time range",
    month: "Month",
    quarter: "3 months",
    year: "Year",
    start: "Start",
    latest: "Latest",
    empty: "No measurements yet",
  },
};

export const words = {
  meters: {
    register: "Utility meters",
    history: "Reading history",
    add: "Add reading",
    saved: "Reading saved",
    error: "Reading not saved",
    errorDetail: "Check the date and value.",
    noReadings: "No readings yet",
    photo: "View reading photo",
    units: { kWh: "kWh", m3: "m³", litre: "L" },
    amount: (number: string, unit: string) => `${number}\u00a0${unit}`,
    latest: (value: string) => `Latest · ${value}`,
    previous: (value: string) => `Previous · ${value}`,
    usage: (value: string, elapsed: string) => `${value} used · ${elapsed}`,
    dateTime: (date: string, time: string) => `${date} · ${time}`,
  },
};

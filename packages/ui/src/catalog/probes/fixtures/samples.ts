/** Shared Trot example events; used only by component examples. */
export const sampleWalks = [
  { time: "09:00", title: "Morning park walk", done: true },
  { time: "12:30", title: "Lunch walk" },
  { time: "17:00", title: "River walk" },
];

/** Shared Trot example list rows; used only by component examples. */
export const sampleWalkRows = [
  {
    title: "Morning park walk",
    meta: "09:00 · two dogs",
    icon: "dog" as const,
    trail: "value" as const,
    value: "£18",
  },
  {
    title: "River walk",
    meta: "14:30 · one dog",
    icon: "clock" as const,
    trail: "badge" as const,
    value: "Booked",
  },
];

/** Shared Ledge image rows; used only by component examples. */
export const samplePlantRows = [
  { title: "Aloe", meta: "Bedroom · water Friday", photo: "lib:plants", trail: "none" as const },
  {
    title: "Pothos",
    meta: "Hall · due Sunday",
    photo: "lib:plants",
    trail: "chevron" as const,
    goto: "pothos",
  },
];

import type { DataWords } from "..";

export const words = {
  heatDay: (index, short) =>
    (short
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])[index]!,
  heatDetail: (style) =>
    style === "weeks" ? "Weeks start on Monday" : "Two-hour blocks · Scroll for later hours",
  heatHour: (hour, short) => (short ? `${hour}h` : `${hour}:00`),
  heatLegend: (unit) => `Intensity scale · ${unit}`,
  heatReading: (label, values) => `${label}: ${values.join(" · ")}`,
  heatValue: (day, slot, value, unit) => `${day}, ${slot}: ${value} ${unit}`,
  heatWeek: (week, short) => (short ? `W${week}` : `Week ${week}`),
} satisfies Pick<
  DataWords,
  "heatDay" | "heatDetail" | "heatHour" | "heatLegend" | "heatReading" | "heatValue" | "heatWeek"
>;

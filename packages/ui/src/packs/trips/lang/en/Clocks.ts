export const words = {
  clocks: {
    home: "Home",
    day: "Daytime",
    night: "Nighttime",
    offset: (hours: string | undefined, minutes: string | undefined, direction: -1 | 0 | 1) =>
      `${direction > 0 ? "+" : direction < 0 ? "−" : ""}${hours ? `${hours} h` : ""}${hours && minutes ? " " : ""}${minutes ? `${minutes} min` : ""}`,
    placeLine: (place: string, time: string, offset: string, daylight: string) =>
      `${place}: ${time}, ${offset}, ${daylight}`,
  },
};

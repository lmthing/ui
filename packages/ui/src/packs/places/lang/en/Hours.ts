export const words = {
  hoursOpen: (time: string) => `Open now · closes ${time}`,
  hoursClosed: "Closed now",
  hoursToday: (day: string) => `${day} · Today`,
  hoursSpecial: "Special hours",
  hoursSpecialToday: "Special hours today",
  hoursDash: "–",
  hoursDayLine: (day: string, hours: string) => `${day}: ${hours}`,
  hoursNoticeLine: (date: string, text: string, formattedDate?: string) =>
    `${date}: ${JSON.stringify(text)}${formattedDate ? ` (${formattedDate})` : ""}`,
};

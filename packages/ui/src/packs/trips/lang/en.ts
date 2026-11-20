export const en = {
  weather: {
    today: "Today",
    forecast: "Forecast",
    sampleForecast: "Sample forecast",
    todayHeading: (today: string, forecast: string) => `${today} · ${forecast}`,
    typical: (month: string) => `Typical weather in ${month}`,
    sampleTypical: (month: string) => `Sample · ${month} averages`,
    conditions: { clear: "Clear", cloudy: "Cloudy", rain: "Rain" },
    iconPlaceholder: "●",
    degrees: (value: string) => `${value}°`,
    range: (high: string, low: string) => `${high} / ${low}`,
    celsiusRange: (range: string) => `${range}C`,
    highsAndLows: (high: string, low: string) => `High ${high}, low ${low} Celsius`,
    rain: (chance: string) => `${chance} rain`,
    dayLabel: (day: string, condition: string) => `${day}, ${condition}`,
    reading: (lines: readonly string[]) => lines.join(" · "),
    unavailable: "Weather unavailable",
    offline: "You’re offline",
    tryLater: "Check again later.",
    reconnect: "Connect to see the forecast.",
  },
};

export type TripsWords = typeof en;

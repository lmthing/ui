export const words = {
  timeClock: {
    shift: "Work shift",
    on: "On shift",
    off: "Off shift",
    onBreak: "On break",
    clockedOut: "Clocked out",
    clockIn: "Clock in",
    clockOut: "Clock out",
    startBreak: "Start break",
    endBreak: "End break",
    elapsed: "Time on shift",
    since: (time: string) => `Clocked in at ${time}`,
    breaks: (count: string, form: Intl.LDMLPluralRule) =>
      form === "one" ? `${count} break today` : `${count} breaks today`,
  },
};

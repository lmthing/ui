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
    breakElapsed: "Time on break",
    verification: {
      kiosk: "Verification required",
      geofence: "Location check required",
      pin: "PIN required",
    },
    since: (time: string) => `Clocked in at ${time}`,
    breaks: (count: string, form: Intl.LDMLPluralRule) =>
      form === "one" ? `${count} break today` : `${count} breaks today`,
  },
};

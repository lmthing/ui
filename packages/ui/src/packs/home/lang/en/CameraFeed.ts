export const words = {
  cameraFeed: {
    modes: { home: "Home", away: "Away", disarmed: "Disarmed", privacy: "Privacy" },
    kinds: { motion: "Motion", person: "Person", doorbell: "Doorbell", sound: "Sound" },
    mode: "Arming mode",
    preview: "Camera preview",
    live: "Live feed",
    snapshot: "Not live",
    noFrame: "No frame available",
    private: "Camera is private",
    audioOn: "Mute",
    audioOff: "Unmute",
    talk: "Talk",
    siren: "Siren",
    events: "Recent events",
    empty: "No recent events",
    success: "Mode updated",
    error: "Camera offline or feed unavailable",
    eventDate: (date: string) => ` · ${date}`,
    eventLine: (id: string, label: string, date: string, clock: string) =>
      `${id} ${label} · ${date} · ${clock}`,
  },
};

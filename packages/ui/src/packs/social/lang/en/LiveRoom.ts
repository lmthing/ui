import type { LDMLPluralRule } from "../../../../catalog";

const listenerUnit = (form: LDMLPluralRule) => (form === "one" ? "listener" : "listeners");

export const liveRoomWords = {
  listenerUnit,
  listeners: (count: string, form: LDMLPluralRule) => `${count} ${listenerUnit(form)}`,
  role: { host: "Host", cohost: "Co-host", speaker: "Speaker" },
  speaking: "Speaking",
  muted: "Muted",
  speakerStatus: (name: string, status: string) => `${name}: ${status}`,
  connect: "Join audio",
  speak: "Unmute mic",
  mute: "Mute mic",
  hand: "Raise hand",
  lower: "Lower hand",
  react: "Reactions",
  closeReact: "Close reactions",
  applaud: "Applaud",
  heart: "Send a heart",
  leave: "Leave",
  end: "End room",
  muteSpeaker: (name: string) => `Mute ${name}`,
  loading: "Connecting to audio…",
  success: "The room has ended.",
  error: "Audio connection lost.",
};

export const words = { liveRoom: liveRoomWords };

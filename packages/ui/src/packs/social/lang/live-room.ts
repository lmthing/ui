import type { LDMLPluralRule } from "../../../catalog";

export const liveRoomWords = {
  listeners: (count: string, form: LDMLPluralRule) => `${count} ${form === "one" ? "listener" : "listeners"}`,
  role: { host: "Host", cohost: "Co-host", speaker: "Speaker" },
  speaking: "Speaking",
  muted: "Muted",
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

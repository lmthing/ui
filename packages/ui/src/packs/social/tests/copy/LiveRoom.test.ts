import { expect, it } from "vitest";
import { liveRoomActiveSpeaker, liveRoomListenerLine, liveRoomSpeakerStatus } from "../../copy";

it("uses locale-aware listener counts and does not mark a muted speaker active", () => {
  expect(liveRoomListenerLine(1)).toBe("1 listener");
  expect(liveRoomListenerLine(1234, "ar-EG")).toBe("١٢٣٤ listeners");
  const muted = { name: "A", role: "host", speaking: true, muted: true } as const;
  const active = { name: "B", role: "speaker", speaking: true } as const;
  expect(liveRoomSpeakerStatus(muted)).toBe("Muted");
  expect(liveRoomActiveSpeaker([muted, active])).toBe(active);
});

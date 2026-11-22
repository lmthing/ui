import { expect, it } from "vitest";
import { voiceLevel } from "./KitVoiceOrb";

it("clamps the amplitude and ignores it when not listening or speaking", () => {
  expect(voiceLevel("idle", 1)).toBe(0);
  expect(voiceLevel("thinking", 1)).toBe(0);
  for (const state of ["listening", "speaking"] as const) {
    expect(voiceLevel(state, 0.35)).toBe(0.35);
    expect(voiceLevel(state, 2)).toBe(1);
    expect(voiceLevel(state, -0.1)).toBe(0);
    expect(voiceLevel(state, Number.NaN)).toBe(0);
  }
});

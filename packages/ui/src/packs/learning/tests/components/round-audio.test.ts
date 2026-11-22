import { expect, it, vi } from "vitest";
import { components, type ScreenLike } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";

const cards = [
  { front: "First", back: "First answer", audio: "lib:one" },
  { front: "Second", back: "Second answer" },
  { front: "Third", back: "Third answer", audio: "lib:three" },
];
const questions = [
  { question: "First?", kind: "truefalse", answer: true, media: "lib:one" },
  { question: "Second?", kind: "truefalse", answer: true },
  { question: "Third?", kind: "truefalse", answer: true, media: "lib:three" },
];

it.each([
  { entry: { id: "learn", c: "Flashcard", cards }, reveal: "learn/card", advance: "learn/good" },
  { entry: { id: "learn", c: "Quiz", questions }, reveal: "learn/check", advance: "learn/next" },
])("offers audio only on the active authored round of $entry.c", ({ entry, reveal, advance }) => {
  const screen: ScreenLike = { id: "home", components: [entry] };
  const open = vi.fn(() => {
    throw new Error("fixture clip is unavailable");
  });
  const controller = createScreenController({
    screen,
    defs: components,
    media: { open },
    resolvePlayback: () => "any_clip",
    requireMounted: false,
  });
  const play = (part: string) => controller.act({ address: `learn/${part}`, action: "play" });
  function nextRound() {
    if (entry.c === "Quiz")
      expect(controller.act({ address: "learn", action: "select", value: 0 }).ok).toBe(true);
    expect(controller.press(reveal).ok).toBe(true);
    expect(play("audio").ok).toBe(false);
    expect(controller.press(advance).ok).toBe(true);
  }
  try {
    expect(play("audio_3").ok).toBe(false);
    expect(play("audio").ok).toBe(true);
    expect(controller.read()).toContain("Audio unavailable");
    nextRound();
    expect(play("audio_2").ok).toBe(false);
    expect(controller.read()).not.toContain("Audio unavailable");
    nextRound();
    expect(controller.read()).toContain("[learn/audio_3 play");
    expect(controller.read()).not.toContain("Audio unavailable");
    expect(play("audio_3").ok).toBe(true);
    expect(open).toHaveBeenCalledTimes(2);
  } finally {
    controller.dispose();
  }
});

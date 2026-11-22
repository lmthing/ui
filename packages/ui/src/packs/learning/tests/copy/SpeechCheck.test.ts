import { expect, it } from "vitest";
import { projectSpeechCheck, speechAttempts, speechScoreLine } from "../../copy";

const words = [
  { id: "r1", text: "Hello" },
  { id: "r2", text: "there" },
];
const seed = { style: "listen", detail: "brief", phrase: "Hello there", phonetic: "hint", words };
const scope = { instance: "s1", phrase: seed.phrase };
const scored = { ...scope, phase: "scored", score: 75, statuses: ["correct", "close"], passed: false };
const project = (...records: unknown[]) => projectSpeechCheck(seed, "s1", { [speechAttempts]: records });

it("only uses a valid current attempt for the same phrase and address", () => {
  for (const invalid of [
    { ...scored, instance: "s2" },
    { ...scored, phrase: "A different prompt" },
    { ...scored, score: 101 },
    { ...scored, statuses: ["correct"] },
    { ...scored, statuses: ["correct", "ungraded"] },
    { ...scored, bytes: "not a presentation field" },
  ])
    expect(project(invalid)).toMatchObject({
      canEvaluate: false,
      canRetry: false,
      showWords: false,
      phrase: undefined,
    });
  expect(project(scored, scored).showWords).toBe(false);
  expect(project(scored)).toMatchObject({
    words: [
      { ...words[0], status: "correct" },
      { ...words[1], status: "close" },
    ],
    phrase: seed.phrase,
    phonetic: undefined,
    fluencyScore: 75,
    canRetry: true,
    canEvaluate: false,
  });
});

it("projects only the admitted phases and localized public feedback", () => {
  expect(project({ ...scope, phase: "recording", level: 0.5, elapsedSeconds: 7 })).toMatchObject({
    canCapture: true,
    canEvaluate: false,
    recording: true,
    level: 0.5,
    elapsedSeconds: 7,
  });
  expect(project({ ...scope, phase: "recorded" })).toMatchObject({
    phrase: seed.phrase,
    canEvaluate: true,
    canRetry: true,
    canCapture: false,
  });
  expect(project({ ...scope, phase: "denied" })).toMatchObject({
    phrase: undefined,
    canEvaluate: false,
    canRetry: true,
    outcome: "denied",
  });
  expect(project({ ...scope, phase: "unclear" })).toMatchObject({
    phrase: seed.phrase,
    canEvaluate: false,
    canRetry: true,
    outcome: "error",
  });
  expect(speechScoreLine(75, "en-GB")).toBe("75%");
});

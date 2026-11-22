import { expect, it } from "vitest";
import { stageSequence, validateSequenceSeek } from "./sequence";

it("requires a bounded integer for own seeks and the exact position for addressed seeks", () => {
  expect(validateSequenceSeek(2, { max: 2 })).toBeNull();
  expect(validateSequenceSeek(2.01, { max: 2 })).toMatchObject({ code: "invalid_value" });
  expect(validateSequenceSeek(undefined, { max: 2, implicit: 0 })).toBeNull();
  expect(validateSequenceSeek(1, { max: 2, implicit: 0 })).toMatchObject({ code: "invalid_value" });
});

it("captures elapsed time on pause and atomically moves and resets the frame deadline on seek", () => {
  const state = { index: 0, max: 4, since: 100, interval: 250 };
  const paused = stageSequence({ ...state, action: "pause" }, undefined, 430);
  expect(paused).toEqual({ index: 1, elapsedMs: 80 });
  expect(stageSequence({ ...paused, max: 4, action: "play" }, undefined, 1000)).toEqual({
    index: 1,
    since: 920,
  });
  expect(stageSequence({ ...state, action: "seek" }, 3, 430)).toEqual({ index: 3, since: 430 });
});

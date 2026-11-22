import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { sequenceKey } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { defs, interval, screen } from "../../../../test/kit/wave-six/story-data";
import { beginSequenceHold, sequenceTransport } from "./sequence-hold";

const address = "home/story/story";
const key = `home/story/${sequenceKey}`;
const open = () => createScreenController({ defs, screen });
const transport = () => sequenceTransport(runtime, address, key);
let runtime: ReturnType<typeof open>;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  runtime = open();
  runtime.mount();
});
afterEach(() => {
  runtime.dispose();
  vi.useRealTimers();
});

it("freezes the original elapsed time and resumes a cancelled or long hold without tapping", () => {
  vi.advanceTimersByTime(interval / 2);
  const tap = vi.fn();
  for (const releasedAt of [undefined, 250]) {
    const end = beginSequenceHold(transport(), 0, tap);
    expect(runtime.store.get(key)).toEqual({ index: 0, elapsedMs: interval / 2 });
    vi.advanceTimersByTime(interval * 2);
    end(releasedAt);
    expect(runtime.actionsAt(address)).toContain("pause");
  }
  vi.advanceTimersByTime(interval / 2 - 1);
  expect(runtime.snapshotScreen().components[0]?.current).toBe(0);
  vi.advanceTimersByTime(1);
  expect(runtime.snapshotScreen().components[0]?.current).toBe(1);
  expect(tap).not.toHaveBeenCalled();
});

it("resumes before a short activation so moving next restarts the step clock", () => {
  vi.advanceTimersByTime(interval / 2);
  const tap = vi.fn(() => runtime.press("home/story/next"));
  beginSequenceHold(transport(), 100, tap)(349);
  expect(tap).toHaveBeenCalledOnce();
  expect(runtime.store.get(key)).toEqual({ index: 1, since: interval / 2 });
  vi.advanceTimersByTime(interval - 1);
  expect(runtime.snapshotScreen().components[0]?.current).toBe(1);
  vi.advanceTimersByTime(1);
  expect(runtime.snapshotScreen().components[0]?.current).toBe(2);
});

it("does not resume a previously paused sequence or undo a stop during the gesture", () => {
  const dispatch = (action: "stop" | "play" | "pause") => runtime.act({ address, action }).ok;
  vi.advanceTimersByTime(40);
  expect(dispatch("pause")).toBe(true);
  beginSequenceHold(transport(), 0, vi.fn())(300);
  expect(runtime.store.get(key)).toEqual({ index: 0, elapsedMs: 40 });
  expect(dispatch("play")).toBe(true);
  const release = beginSequenceHold(transport(), 0, vi.fn());
  expect(dispatch("stop")).toBe(true);
  release();
  expect(runtime.store.get(key)).toEqual({ index: 0 });
});

it("taps on short release even without an available transport", () => {
  const tap = vi.fn();
  beginSequenceHold(undefined, 100, tap)(349);
  beginSequenceHold(undefined, 100, tap)(350);
  beginSequenceHold(undefined, 100, tap)();
  expect(tap).toHaveBeenCalledOnce();
  expect(runtime.actionsAt(address)).toContain("pause");
});

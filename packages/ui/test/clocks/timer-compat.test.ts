import { afterEach, expect, it, vi } from "vitest";
import { components } from "@lmthing/ui/catalog";
import { single, setup } from "./clock-fixtures";
afterEach(() => vi.useRealTimers());
it.each([
  { style: "down", seconds: 0 },
  { style: "up", seconds: 86400 },
])("preserves Timer controls at its $style terminal value", ({ style, seconds }) => {
  vi.useFakeTimers();
  const { runtime, live } = setup(components.Timer, { style, seconds, label: "Clock" });
  expect(runtime.press("f1/start")).toMatchObject({ ok: true });
  expect(runtime.actionsAt("f1/stop")).toEqual(["stop"]);
  expect(vi.getTimerCount()).toBe(1);
  runtime.tick();
  expect(live().seconds).toBe(seconds);
  expect(runtime.actionsAt("f1/start")).toEqual(["start"]);
  expect(runtime.actionsAt("f1/stop")).toEqual([]);
  expect(vi.getTimerCount()).toBe(0);
  runtime.dispose();
});
it("keeps overdue clocks scheduled until the finishing tick is committed", () => {
  vi.useFakeTimers();
  const { runtime, advance } = setup(single, { seconds: 1 });
  runtime.press("f1/begin");
  advance(2000, false);
  runtime.mount();
  expect(vi.getTimerCount()).toBe(1);
  vi.advanceTimersByTime(1000);
  expect(runtime.store.get("test/f1/$clock")).toMatchObject({ running: false, seconds: 0 });
  expect(vi.getTimerCount()).toBe(0);
  runtime.dispose();
});

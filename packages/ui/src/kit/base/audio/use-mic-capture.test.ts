import { expect, it, vi } from "vitest";
import { createMicCapture } from "../../interact/runtime/capture";
import { nativeMicEvents } from "./use-mic-capture";

it("routes native accessibility activation through the same capture toggle", async () => {
  const session = { close: vi.fn() };
  const open = vi.fn(() => session);
  const capture = createMicCapture({ open });
  let pending: Promise<void> | undefined;
  const address = "test/mic/record";
  const events = nativeMicEvents(() => {
    if (capture.phase(address) === "recording") capture.release(address, "stop");
    else pending = capture.start(address, () => true);
  });
  expect(events.accessibilityActions).toEqual([{ name: "activate" }]);
  events.onAccessibilityAction({ nativeEvent: { actionName: "increment" } });
  expect(open).not.toHaveBeenCalled();
  events.onAccessibilityAction({ nativeEvent: { actionName: "activate" } });
  await pending;
  expect(open).toHaveBeenCalledOnce();
  expect(capture.phase(address)).toBe("recording");
  events.onAccessibilityTap();
  expect(session.close).toHaveBeenCalledExactlyOnceWith("stop");
});

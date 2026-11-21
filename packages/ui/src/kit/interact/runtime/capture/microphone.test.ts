import { expect, it, vi } from "vitest";
import { createMicCapture, type MicCaptureSession } from "./microphone";

it("cancels a pending open and discards late permission without disturbing a later session", async () => {
  let resolve!: (session: MicCaptureSession) => void;
  const old = { close: vi.fn() },
    next = { close: vi.fn() };
  const open = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<MicCaptureSession>((done) => {
          resolve = done;
        }),
    )
    .mockReturnValueOnce(next);
  const capture = createMicCapture({ open });
  const admit = vi.fn(() => true);
  const pending = capture.start("first", admit);
  expect(capture.phase("first")).toBe("pending");
  capture.release("first", "stop");
  expect(open.mock.calls[0]?.[1].aborted).toBe(true);
  await capture.start("second", admit);
  resolve(old);
  await pending;
  expect(admit).toHaveBeenCalledOnce();
  expect(old.close).toHaveBeenCalledExactlyOnceWith("cancel");
  expect(capture.phase("second")).toBe("recording");
  capture.release("second", "stop");
  expect(next.close).toHaveBeenCalledExactlyOnceWith("stop");
});

it("shows unavailable for rejected permission, supports retry and cleans up on reset", async () => {
  const session = { close: vi.fn() };
  const open = vi.fn().mockRejectedValueOnce(new Error("Denied")).mockReturnValueOnce(session);
  const capture = createMicCapture({ open });
  const admit = vi.fn(() => true);
  await capture.start("mic", admit);
  expect(capture.phase("mic")).toBe("unavailable");
  expect(admit).not.toHaveBeenCalled();
  await capture.start("mic", admit);
  expect(capture.phase("mic")).toBe("recording");
  capture.reset();
  expect(capture.phase("mic")).toBe("idle");
  expect(session.close).toHaveBeenCalledExactlyOnceWith("cancel");
});

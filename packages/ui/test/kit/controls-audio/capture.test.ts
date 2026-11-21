import { expect, it, vi } from "vitest";
import { createScreenController, type MicCaptureSession } from "@lmthing/ui/kit";
import { defs, screen } from "./fixture-data";

const address = "test/mic/record";

it("requires a mounted ok-tier part and never opens audio through the agent action path", async () => {
  const session = { close: vi.fn() };
  const open = vi.fn(() => session);
  const onAction = vi.fn();
  const controller = createScreenController({
    screen,
    defs,
    requireMounted: true,
    micCapture: { open },
    onAction,
  });
  await controller.startMicCapture(address);
  const other = "test/mic/record_other";
  controller.registerPart(other);
  await controller.startMicCapture(other);
  expect(open).not.toHaveBeenCalled();
  controller.registerPart(address);
  expect(controller.act({ address, action: "start" }, { agent: true }).ok).toBe(true);
  expect(open).not.toHaveBeenCalled();
  onAction.mockClear();
  await controller.startMicCapture(address);
  expect(controller.micCapturePhase(address)).toBe("recording");
  expect(onAction).toHaveBeenCalledExactlyOnceWith({ address, action: "start" });
  expect(controller.act({ address, action: "stop" }, { dryRun: true }).ok).toBe(true);
  expect(session.close).not.toHaveBeenCalled();
  expect(controller.act({ address, action: "stop" }, { agent: true }).ok).toBe(true);
  expect(controller.micCapturePhase(address)).toBe("idle");
  controller.dispose();
  expect(session.close).toHaveBeenCalledExactlyOnceWith("stop");
});

it("does not activate a microphone whose target was disabled while permission was pending", async () => {
  const session = { close: vi.fn() };
  let grant!: (session: MicCaptureSession) => void;
  const open = () =>
    new Promise<MicCaptureSession>((resolve) => {
      grant = resolve;
    });
  const onAction = vi.fn();
  const controller = createScreenController({ screen, defs, micCapture: { open }, onAction });
  const pending = controller.startMicCapture(address);
  expect(controller.micCapturePhase(address)).toBe("pending");
  controller.registerDisabledPart(address);
  grant(session);
  await pending;
  expect(onAction).not.toHaveBeenCalled();
  expect(controller.micCapturePhase(address)).toBe("idle");
  expect(session.close).toHaveBeenCalledExactlyOnceWith("cancel");
  controller.dispose();
});

it("closes a root-part microphone even when the component itself is named root", async () => {
  const session = { close: vi.fn() };
  const open = vi.fn(() => session);
  const controller = createScreenController({
    screen: { ...screen, components: [{ id: "root", c: "ControlsFixture" }] },
    defs,
    micCapture: { open },
  });
  const root = "test/root/root";
  await controller.startMicCapture(root);
  expect(open).toHaveBeenCalledExactlyOnceWith(root, expect.any(AbortSignal));
  expect(controller.micCapturePhase(root)).toBe("recording");
  expect(controller.act({ address: root, action: "stop" }).ok).toBe(true);
  expect(session.close).toHaveBeenCalledExactlyOnceWith("stop");
  expect(controller.micCapturePhase(root)).toBe("idle");
  controller.dispose();
});

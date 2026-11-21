import type { ActStep } from "../../../../catalog";
import type { ActReply } from "../../index";
import type { ControllerContext } from "../index";

export function captureAccess(
  ctx: ControllerContext,
  act: (step: ActStep) => ActReply,
  startOffered: (address: string, ignoreDisabled: boolean) => boolean,
) {
  const { micCapture } = ctx;
  const canStart = (address: string) =>
    micCapture.available &&
    ctx.options.interactive !== false &&
    address.startsWith(`${ctx.screen.id}/`) &&
    (!ctx.options.requireMounted || ctx.mounted.has(ctx.relative(address))) &&
    startOffered(address, false);
  return {
    micCaptureAvailable: micCapture.available,
    micCapturePhase: micCapture.phase,
    offersMicCapture: (address: string) => startOffered(address, true),
    subscribeMicCapture: micCapture.subscribe,
    startMicCapture(address: string) {
      if (canStart(address))
        return micCapture.start(
          address,
          () => canStart(address) && act({ address, action: "start" }).ok && !ctx.confirmationFor(),
        );
    },
    stopMicCapture(address: string) {
      if (micCapture.release(address, "stop")) act({ address, action: "stop" });
    },
    cancelMicCapture: (address: string) => {
      micCapture.release(address, "cancel");
    },
  };
}

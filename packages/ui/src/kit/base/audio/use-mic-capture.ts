import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import { isWeb } from "tamagui";
import { useKit } from "../../provider";
import { buttonEvents, useContinuousPress } from "../controls";

const noSubscribe = () => () => {};

export function nativeMicEvents(toggle: () => void) {
  return {
    accessibilityActions: [{ name: "activate" }],
    onAccessibilityAction: ({ nativeEvent }: { nativeEvent: { actionName: string } }) => {
      if (nativeEvent.actionName === "activate") toggle();
    },
    onAccessibilityTap: toggle,
  };
}

export function useMicCapture(address: string, inactive: boolean, style: "hold" | "toggle") {
  const { interactive, controller } = useKit();
  const phase = useSyncExternalStore(
    controller?.subscribeMicCapture ?? noSubscribe,
    () => controller?.micCapturePhase(address) ?? "unavailable",
    () => controller?.micCapturePhase(address) ?? "unavailable",
  );
  const engaged = phase === "pending" || phase === "recording";
  const startOffered = controller?.offersMicCapture(address);
  const enabled = Boolean(
    interactive && controller?.micCaptureAvailable && !inactive && (engaged || startOffered),
  );
  const start = () => {
    void controller?.startMicCapture(address);
  };
  const stop = () => controller?.stopMicCapture(address);
  const toggle = () => {
    const current = controller?.micCapturePhase(address);
    if (current === "pending" || current === "recording") stop();
    else start();
  };
  useEffect(
    () =>
      inactive || !controller?.micCaptureAvailable ? controller?.registerDisabledPart(address) : undefined,
    [controller, inactive, address],
  );
  useLayoutEffect(
    () => () => controller?.cancelMicCapture(address),
    [controller, address, interactive, inactive, style],
  );
  const hold = useContinuousPress(enabled && style === "hold", controller, address, {
    begin: start,
    end: stop,
  });
  const events = !enabled
    ? {}
    : style === "toggle"
      ? buttonEvents(toggle)
      : isWeb
        ? hold
        : { ...hold, ...nativeMicEvents(toggle) };
  return { events, phase, enabled, unavailable: phase === "unavailable" };
}

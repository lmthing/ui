import { useSyncExternalStore } from "react";
import { formatAddress } from "../../catalog";
import { usePartContext } from "../part";
import { useKit } from "../provider";

const subscribeNone = () => () => {};

export function useScannerBrightness(part: string) {
  const { screen, component } = usePartContext();
  const { controller, interactive } = useKit();
  const address = formatAddress({ screen, component, part });
  const status = useSyncExternalStore(
    controller?.store.subscribe ?? subscribeNone,
    () => (interactive ? controller?.scannerBrightnessStatus?.(address) : undefined) ?? "off",
    () => "off" as const,
  );
  return { status, available: interactive && controller?.scannerBrightnessAvailable?.() === true };
}

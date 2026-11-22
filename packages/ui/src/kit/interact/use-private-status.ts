import { useLayoutEffect, useSyncExternalStore } from "react";
import { formatAddress } from "../../catalog";
import { usePartContext } from "../part";
import { useKit } from "../provider";

const subscribeNone = () => () => {};

/** Only local feedback is exposed. No value or host diagnostic is returned. */
export function usePrivateStatus(part: string, kind: "copy" | "verify") {
  const context = usePartContext();
  return usePrivateStatusAt(formatAddress({ ...context, part }), kind);
}

export function usePrivateStatusAt(address: string | undefined, kind: "copy" | "verify", disabled = false) {
  const { controller, interactive } = useKit();
  useLayoutEffect(
    () => (address && disabled ? controller?.registerDisabledPart(address) : undefined),
    [address, controller, disabled],
  );
  return useSyncExternalStore(
    (address && controller?.subscribePrivateValues) || subscribeNone,
    () => (address && interactive ? controller?.privateStatus?.(address, kind) : undefined) ?? "unavailable",
    () => "unavailable" as const,
  );
}

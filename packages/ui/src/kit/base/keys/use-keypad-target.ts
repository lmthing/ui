import { useLayoutEffect, useSyncExternalStore } from "react";
import type { KeypadEdit } from "../../../catalog";
import type { ScreenController } from "../../interact";
import { usePart } from "../../part";
import { useKit } from "../../provider";

const subscribeNone = () => () => {};

export function useKeypadLength(address: string) {
  const { controller } = useKit();
  const snapshot = () => controller?.privateKeypadLength?.(address);
  return useSyncExternalStore(controller?.subscribePrivateValues ?? subscribeNone, snapshot, snapshot);
}

export function sendKeypadEdit(controller: ScreenController | undefined, address: string, value: KeypadEdit) {
  if (!controller?.privateKeypadEdit?.(address, value)) controller?.act({ address, action: "type", value });
}

export function useKeypadTarget(part: string, addressed: boolean, disabled: boolean, guard = addressed) {
  const { controller } = useKit();
  const address = usePart(part, addressed);
  useLayoutEffect(
    () => (guard && disabled ? controller?.registerDisabledPart(address.testID) : undefined),
    [guard, disabled, controller, address.testID],
  );
  return address;
}

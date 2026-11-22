import { useSyncExternalStore } from "react";
import { useKit } from "../../provider";
import type { ScreenController } from "../index";

const subscribeNone = () => () => {};

export function useNumericControl(address: string, enabled: boolean) {
  const { controller } = useKit();
  const snapshot = () => (enabled ? JSON.stringify(controller?.numericControl?.(address)) : undefined);
  const encoded = useSyncExternalStore(controller?.store?.subscribe ?? subscribeNone, snapshot, snapshot);
  return encoded === undefined
    ? undefined
    : (JSON.parse(encoded) as ReturnType<ScreenController["numericControl"]>);
}

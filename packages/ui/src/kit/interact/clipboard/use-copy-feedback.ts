import { useLayoutEffect, useSyncExternalStore } from "react";
import { useKit } from "../../provider";
import { usePartDisabled } from "../../part";

const subscribeNone = () => () => {};
export function useCopyFeedback(address: string | undefined, text: unknown, disabled: boolean) {
  const { controller } = useKit();
  const blocked = usePartDisabled(address);
  useLayoutEffect(() => {
    if (!address || !controller) return;
    return !disabled && typeof text === "string" && text.length
      ? controller.registerCopyTarget(address, text)
      : controller.registerDisabledPart(address);
  }, [address, text, disabled, controller]);
  return useSyncExternalStore(
    (address && controller?.store.subscribe) || subscribeNone,
    () => Boolean(!blocked && address && typeof text === "string" && controller?.copiedAt(address, text)),
    () => false,
  );
}

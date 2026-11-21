import { useLayoutEffect, useSyncExternalStore } from "react";
import { useKit } from "../../provider";

const subscribeNone = () => () => {};
export function useCopyFeedback(address: string | undefined, text: unknown, disabled: boolean) {
  const { controller } = useKit();
  useLayoutEffect(() => {
    if (!address || !controller) return;
    return !disabled && typeof text === "string" && text.length
      ? controller.registerCopyTarget(address, text)
      : controller.registerDisabledPart(address);
  }, [address, text, disabled, controller]);
  return useSyncExternalStore(
    (address && controller?.store.subscribe) || subscribeNone,
    () => Boolean(address && typeof text === "string" && controller?.copiedAt(address, text)),
    () => false,
  );
}

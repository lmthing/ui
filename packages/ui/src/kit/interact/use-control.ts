import { useSyncExternalStore } from "react";
import { useKit } from "../provider";
const subscribeNone = () => () => {};
export function useControlValue<T>(address: string, fallback: T): T {
  const { controller } = useKit();
  return useSyncExternalStore(
    controller?.store.subscribe ?? subscribeNone,
    () => (controller?.store.get(address) as T) ?? fallback,
    () => fallback,
  );
}

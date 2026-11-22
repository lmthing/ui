import { useLayoutEffect } from "react";
import { formatAddress, jumpKey } from "../../catalog";
import { usePartContext } from "../part";
import { useKit } from "../provider";

/** Respond once per accepted press, not on initial mount or when a table's geometry changes. */
export function useAddressedJump(part: string | undefined, reveal: () => void) {
  const { screen, component } = usePartContext();
  const store = useKit().controller?.store;
  const address = jumpKey(formatAddress({ screen, component, part: part ?? "root" }).replace(/\/root$/, ""));
  useLayoutEffect(() => {
    if (!store || !part) return;
    let previous = Number(store.get(address) ?? 0);
    return store.subscribe(() => {
      const cue = Number(store.get(address) ?? 0);
      const advanced = cue > previous;
      previous = cue;
      if (advanced) reveal();
    });
  }, [store, address, part, reveal]);
}

import { useLayoutEffect, type RefObject } from "react";
import { isWeb } from "tamagui";
import { useKit } from "../../provider";

/** Register the same addressed ref used by the part, without executing anything during planning. */
export function useLocalAnchor(address: string, ref: RefObject<unknown>, enabled = true) {
  const { controller, nativeHost } = useKit();
  useLayoutEffect(() => {
    if (!enabled) return;
    return controller?.registerAnchor(address, (action) => {
      const node = ref.current as {
        focus?: () => void;
        scrollIntoView?: (options: ScrollIntoViewOptions) => void;
      } | null;
      if (!node) return;
      if (action === "focus") node.focus?.();
      else if (isWeb) node.scrollIntoView?.({ block: "nearest", inline: "nearest" });
      else nativeHost?.ensureVisible?.(node);
    });
  }, [address, controller, enabled, nativeHost, ref]);
}

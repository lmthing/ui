import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import type { TamaguiElement } from "tamagui";
import { formatAddress } from "../../catalog";
import { useKit } from "../provider";
import { usePartContext } from "./part-context";
import { PartRefScope } from "./part-ref-scope";

const subscribeNone = () => () => {};
export function usePartDisabled(address: string | undefined) {
  const { controller } = useKit();
  return useSyncExternalStore(
    (address && controller?.subscribeDisabledParts) || subscribeNone,
    () => Boolean(address && controller?.isPartDisabled?.(address)),
    () => false,
  );
}

type Measurable = {
  getBoundingClientRect?: () => { x: number; y: number; width: number; height: number };
  measureLayout?: (
    root: unknown,
    success: (x: number, y: number, width: number, height: number) => void,
    failure: () => void,
  ) => void;
};
export function usePart(part = "root", enabled = true) {
  const { screen, component, item, rev } = usePartContext();
  const { parts, root, controller } = useKit();
  const registerRef = useContext(PartRefScope);
  const ref = useRef<TamaguiElement>(null);
  const frame = useRef<number | null>(null);
  const address = formatAddress({ screen, component, ...(item ? { item } : {}), part });
  const onLayout = useCallback(() => {
    if (!enabled) return;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const node = ref.current as Measurable | null;
      const origin = root.current as Measurable | null;
      if (!node || !origin) return;
      if (node.getBoundingClientRect && origin.getBoundingClientRect) {
        const rect = node.getBoundingClientRect();
        const base = origin.getBoundingClientRect();
        parts.register({
          screen,
          rev,
          address,
          rect: { x: rect.x - base.x, y: rect.y - base.y, width: rect.width, height: rect.height },
        });
      } else {
        node.measureLayout?.(
          root.current,
          (x, y, width, height) => parts.register({ screen, rev, address, rect: { x, y, width, height } }),
          () => {},
        );
      }
    });
  }, [parts, root, screen, rev, address, enabled]);
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      if (enabled) parts.unregister({ screen, rev, address });
    },
    [parts, screen, rev, address, enabled],
  );
  useEffect(() => (enabled ? controller?.registerPart(address) : undefined), [controller, address, enabled]);
  useLayoutEffect(
    () => (enabled && ref.current ? registerRef?.(address, ref) : undefined),
    [address, enabled, registerRef],
  );
  return { ref, onLayout, testID: address };
}

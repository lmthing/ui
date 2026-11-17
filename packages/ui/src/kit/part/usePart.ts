import { useCallback, useEffect, useRef } from "react";
import type { TamaguiElement } from "tamagui";
import { formatAddress } from "../../catalog";
import { useKit } from "../provider";
import { usePartContext } from "./part-context";

type Measurable = {
  getBoundingClientRect?: () => { x: number; y: number; width: number; height: number };
  measureLayout?: (root: unknown, success: (x: number, y: number, width: number, height: number) => void,
    failure: () => void) => void;
};
export function usePart(part = "root") {
  const { screen, component, item, rev } = usePartContext();
  const { parts, root } = useKit();
  const ref = useRef<TamaguiElement>(null);
  const frame = useRef<number | null>(null);
  const address = formatAddress({ screen, component, ...(item ? { item } : {}), part });
  const onLayout = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const node = ref.current as Measurable | null;
      const origin = root.current as Measurable | null;
      if (!node || !origin) return;
      if (node.getBoundingClientRect && origin.getBoundingClientRect) {
        const rect = node.getBoundingClientRect(), base = origin.getBoundingClientRect();
        parts.register({ screen, rev, address,
          rect: { x: rect.x - base.x, y: rect.y - base.y, width: rect.width, height: rect.height } });
      } else {
        node.measureLayout?.(root.current, (x, y, width, height) =>
          parts.register({ screen, rev, address, rect: { x, y, width, height } }), () => {});
      }
    });
  }, [parts, root, screen, rev, address]);
  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    parts.unregister({ screen, rev, address });
  }, [parts, screen, rev, address]);
  return { ref, onLayout, testID: address };
}

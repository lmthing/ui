import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";
import { isWeb, type TamaguiElement } from "tamagui";
import type { NativeHost } from "../provider";
import type { ScreenReturnPoint } from "./screen-navigation";

export function useReturnFocus(
  root: RefObject<TamaguiElement | null>,
  restoration: ScreenReturnPoint | undefined,
  host: NativeHost | undefined,
) {
  const refs = useRef(new Map<string, RefObject<TamaguiElement | null>>());
  const register = useCallback((key: string, ref: RefObject<TamaguiElement | null>) => {
    if (!isWeb) refs.current.set(key, ref);
    return () => {
      if (refs.current.get(key) === ref) refs.current.delete(key);
    };
  }, []);
  useLayoutEffect(() => {
    const address = restoration?.address;
    if (!address) return;
    const frame = requestAnimationFrame(() => {
      if (isWeb) focusReturnedPart(root.current as HTMLElement | null, address);
      else {
        const node = refs.current.get(address)?.current ?? refs.current.get(`${address}/root`)?.current;
        if (node) host?.focusAccessibility?.(node);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [root, restoration, host]);
  return register;
}

function focusReturnedPart(root: HTMLElement | null, address: string) {
  // Do not take focus from a new user action, even during an interrupted flight.
  const active = document.activeElement;
  if (!root || (active !== document.body && active?.getClientRects().length && !active.closest("[inert]")))
    return;
  for (const key of [address, `${address}/root`]) {
    const target = root.querySelector<HTMLElement>(`[data-testid="${CSS.escape(key)}"]`);
    if (!target || target.closest('[inert], [aria-disabled="true"]')) continue;
    target.focus({ preventScroll: true });
    if (document.activeElement === target) return;
  }
}

import { useCallback, useContext, useLayoutEffect, useRef, type RefObject } from "react";
import { isWeb, type TamaguiElement } from "tamagui";
import { PartRefScope } from "../part";
import type { NativeHost } from "../provider";
import type { ScreenReturnPoint } from "./screen-navigation";

export type NavigationFocus = {
  address?: string | undefined;
  fallback?: string | undefined;
  tab?: boolean;
  defer?: boolean;
  point?: ScreenReturnPoint | undefined;
};

export function useReturnFocus(
  root: RefObject<TamaguiElement | null>,
  focus: NavigationFocus | undefined,
  host: NativeHost | undefined,
) {
  const refs = useRef(new Map<string, RefObject<TamaguiElement | null>>());
  const parent = useContext(PartRefScope);
  const register = useCallback(
    (key: string, ref: RefObject<TamaguiElement | null>) => {
      if (!isWeb) refs.current.set(key, ref);
      const unregister = parent?.(key, ref);
      return () => {
        if (refs.current.get(key) === ref) refs.current.delete(key);
        unregister?.();
      };
    },
    [parent],
  );
  const { address, fallback, tab, defer, point } = focus ?? {};
  useLayoutEffect(() => {
    if (!address && !fallback && !tab) return;
    const targets = [address, address && `${address}/root`, fallback].filter(Boolean) as string[];
    const restore = () => {
      if (isWeb) return focusDestination(root.current as HTMLElement | null, targets, fallback, tab);
      const target = targets.map((key) => refs.current.get(key)?.current).find(Boolean);
      if (target) host?.focusAccessibility?.(target);
    };
    if (!defer) return restore();
    const frame = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(frame);
  }, [root, address, fallback, tab, defer, point, host]);
  return register;
}

function focusDestination(
  root: HTMLElement | null,
  targets: string[],
  fallback: string | undefined,
  tab: boolean | undefined,
) {
  // Do not take focus from a new user action, even during an interrupted flight.
  const active = document.activeElement;
  if (
    !root ||
    (active !== document.body &&
      active?.getClientRects().length &&
      !active.closest('[inert], [aria-hidden="true"]'))
  )
    return;
  if (tab) {
    root.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus({ preventScroll: true });
    return;
  }
  for (const key of targets) {
    const target = root.querySelector<HTMLElement>(`[data-testid="${CSS.escape(key)}"]`);
    if (!target || target.closest('[inert], [aria-hidden="true"], [aria-disabled="true"]')) continue;
    if (key === fallback && !target.hasAttribute("tabindex")) target.tabIndex = -1;
    target.focus({ preventScroll: true });
    if (document.activeElement === target) return;
  }
}

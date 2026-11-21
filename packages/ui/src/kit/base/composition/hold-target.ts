import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { isWeb } from "tamagui";
import { useKit } from "../../provider";

const activationKey = (key: string) => key === " " || key === "Enter";
type Source = number | string;

function webHold(start: (source: Source) => void, end: (source?: Source) => void, holding: () => boolean) {
  const releasePointer = (event: PointerEvent<HTMLElement>) => end(event.pointerId);
  return {
    cursor: "pointer" as const,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0 || !event.isPrimary || holding()) return;
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      start(event.pointerId);
    },
    onPointerUp: releasePointer,
    onPointerCancel: releasePointer,
    onLostPointerCapture: releasePointer,
    onBlur: () => end(),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (!activationKey(event.key) && event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") end();
      else if (!event.repeat) start(event.key);
    },
    onKeyUp: (event: KeyboardEvent<HTMLElement>) => {
      if (!activationKey(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      end(event.key);
    },
  };
}

/** Keep the face veiled unless this mounted target owns a physical hold. */
export function useHoldTarget(address: string | undefined) {
  const { controller, interactive } = useKit();
  const [held, setHeld] = useState(false);
  const active = useRef<Source | null>(null);
  const enabled = interactive && !!address && !!controller;
  const start = (source: Source) => {
    if (active.current !== null || !controller?.act({ address: address!, action: "start" }).ok) return;
    active.current = source;
    setHeld(true);
  };
  const end = useCallback(
    (source?: Source) => {
      if (active.current === null || (source !== undefined && source !== active.current)) return;
      active.current = null;
      setHeld(false);
      controller?.act({ address: address!, action: "stop" });
    },
    [address, controller],
  );
  useLayoutEffect(() => {
    if (!enabled) return;
    const cancel = () => end();
    if (isWeb) window.addEventListener("blur", cancel);
    return () => {
      if (isWeb) window.removeEventListener("blur", cancel);
      cancel();
    };
  }, [enabled, end]);
  if (!enabled) return { held: false, handlers: {} };
  if (!isWeb)
    return {
      held,
      handlers: { onPressIn: () => start("native"), onPressOut: () => end("native") },
    };
  return { held, handlers: webHold(start, end, () => active.current !== null) };
}

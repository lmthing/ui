import { useEffect, type RefObject } from "react";
import { isWeb, type TamaguiElement } from "tamagui";
import { checkScreen, type Definition, type Issue, type ScreenLike } from "../../catalog";
import { clippedText } from "./clipped-text";

const layoutDelay = 150;
const mountLimit = 300;

export function useReport(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  root: RefObject<TamaguiElement | null>,
  onReport: ((issues: Issue[]) => void) | undefined,
) {
  const fingerprint = JSON.stringify(screen);
  useEffect(() => {
    if (!onReport) return;
    const frame = isWeb ? (root.current as HTMLElement | null) : null;
    let timer: ReturnType<typeof setTimeout>;
    let limit: ReturnType<typeof setTimeout>;
    const send = () => {
      clearTimeout(timer);
      clearTimeout(limit);
      const data = checkScreen(screen, defs, { hostItemIds: true });
      onReport(frame ? [...data, ...clippedText(frame)] : data);
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(send, layoutDelay);
    };
    limit = setTimeout(send, mountLimit);
    schedule();
    const observer = frame && typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    if (frame) observer?.observe(frame);
    return () => {
      clearTimeout(timer);
      clearTimeout(limit);
      observer?.disconnect();
    };
  }, [fingerprint, defs, root, onReport]);
}

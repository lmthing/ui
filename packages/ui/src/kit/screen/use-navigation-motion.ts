import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { isWeb, type TamaguiElement } from "tamagui";
import { durations, motionEase, motionProfiles, type ScreenLike, type ThemeMotion } from "../../catalog";
import { captureTitle, flyTitle } from "./shared-title";
import { animateNumber } from "../motion";

type Intent = {
  from: string;
  goto: string;
  kind: "push" | "back" | "tab";
  shared: ReturnType<typeof captureTitle>;
};

/** The link tells us why the host changed screens; stage jumps and unrelated updates don't fly. */
export function useNavigationMotion(screen: ScreenLike, mode: ThemeMotion, reduced: boolean, agent: boolean) {
  const ref = useRef<TamaguiElement>(null);
  const previous = useRef(screen.id);
  const intent = useRef<Intent | undefined>(undefined);
  const [pose, setPose] = useState<{ x: number; opacity: number } | undefined>(undefined);
  const capture = useCallback(
    (goto: string, address: string) => {
      const source = screen.components.find(({ id }) => id === address.split("/")[1]);
      const kind = goto === "back" ? "back" : source?.c === "TabBar" ? "tab" : "push";
      intent.current = {
        from: screen.id,
        goto,
        kind,
        shared:
          isWeb && kind === "push" && !reduced && !agent
            ? captureTitle(ref.current as HTMLElement | null, address)
            : undefined,
      };
    },
    [screen, reduced, agent],
  );
  useLayoutEffect(() => {
    if (previous.current === screen.id) return;
    previous.current = screen.id;
    const move = intent.current;
    intent.current = undefined;
    if (agent || !move || move.from === screen.id) return;
    if (move.goto !== "back" && move.goto !== screen.id) return;
    const profile = motionProfiles[mode];
    const fade = reduced || move.kind === "tab";
    const node = ref.current as HTMLElement | null;
    const sign = isWeb && node && getComputedStyle(node).direction === "rtl" ? -1 : 1;
    const shift = fade ? 0 : sign * profile.push * (move.kind === "back" ? -1 : 1);
    const options = { duration: reduced ? durations.fast : profile.navigation, easing: motionEase };
    if (!isWeb) {
      return animateNumber(0, 1, (opacity) => setPose({ x: shift * (1 - opacity), opacity }), {
        duration: options.duration,
        done: () => setPose(undefined),
      });
    }
    if (!node?.animate) return;
    const header = screen.components.find(({ c }) => c === "Header");
    const shared = !fade && move.shared && flyTitle(node, screen.id, header?.id, move.shared, shift, options);
    const flight = node.animate(
      [
        { opacity: shared ? 0.85 : 0, transform: `translateX(${shift}px)` },
        { opacity: 1, transform: "none" },
      ],
      options,
    );
    return () => {
      flight.cancel();
      if (shared) shared.cancel();
    };
  }, [screen.id, mode, reduced, agent]);
  return { ref, capture, pose: agent ? undefined : pose };
}

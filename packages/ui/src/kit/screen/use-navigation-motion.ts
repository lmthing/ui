import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { isWeb, type TamaguiElement } from "tamagui";
import { durations, motionEase, motionProfiles, type ScreenLike, type ThemeMotion } from "../../catalog";
import { captureShared, flyShared } from "./shared-elements";
import { captureTab, fadeTab } from "./tab-ghost";
import { animateNumber } from "../motion";
import { announceMotionSettled } from "../part";

type Intent = {
  from: string;
  goto: string;
  kind: "push" | "back" | "tab";
  shared: ReturnType<typeof captureShared>;
  ghost: ReturnType<typeof captureTab>;
  agent: boolean;
  expires: number;
};
type Pose = { x: number; opacity: number };

function matches(move: Intent | undefined, screen: string): move is Intent {
  return Boolean(
    move &&
    move.from !== screen &&
    (move.goto === screen || move.goto === "back") &&
    Date.now() < move.expires,
  );
}

/** The link tells us why the host changed screens; stage jumps and unrelated updates don't fly. */
export function useNavigationMotion(screen: ScreenLike, mode: ThemeMotion, reduced: boolean, agent: boolean) {
  const ref = useRef<TamaguiElement>(null);
  const previous = useRef(screen.id);
  const intent = useRef<Intent | undefined>(undefined);
  const arrivedByAgent = useRef<string | undefined>(undefined);
  const navigatingTo = useRef<string | undefined>(undefined);
  const [pose, setPose] = useState<Pose | undefined>(undefined);
  const capture = useCallback(
    (goto: string, address: string, byAgent: boolean) => {
      const source = screen.components.find(({ id }) => id === address.split("/")[1]);
      const kind = goto === "back" ? "back" : source?.c === "TabBar" ? "tab" : "push";
      const node = isWeb && !agent && !byAgent ? (ref.current as HTMLElement | null) : null;
      intent.current = {
        from: screen.id,
        goto,
        kind,
        agent: byAgent,
        expires: Date.now() + durations.slow * 2,
        shared: kind === "push" && !reduced ? captureShared(node, address) : undefined,
        ghost: kind === "tab" && goto !== screen.id ? captureTab(node) : undefined,
      };
    },
    [screen, reduced, agent],
  );
  const pending = intent.current;
  const navigating = matches(pending, screen.id);
  const cut = navigating && pending.agent;
  useLayoutEffect(() => {
    if (previous.current === screen.id) return;
    previous.current = screen.id;
    const move = intent.current;
    intent.current = undefined;
    arrivedByAgent.current = cut ? screen.id : undefined;
    navigatingTo.current = navigating ? screen.id : undefined;
    if (agent || !matches(move, screen.id) || move.agent) {
      if (!isWeb) setPose(undefined);
      return;
    }
    return playNavigation(ref.current, screen, move, mode, reduced, setPose);
  }, [screen.id, mode, reduced, agent]);
  return {
    ref,
    capture,
    pose: agent || reduced ? undefined : pose,
    agentArrival: cut || arrivedByAgent.current === screen.id,
    navigationArrival: navigating || navigatingTo.current === screen.id,
  };
}

function playNavigation(
  ref: TamaguiElement | null,
  screen: ScreenLike,
  move: Intent,
  mode: ThemeMotion,
  reduced: boolean,
  setPose: (pose: Pose | undefined) => void,
) {
  const profile = motionProfiles[mode];
  const fade = reduced || move.kind === "tab";
  const node = ref as HTMLElement | null;
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
  if (move.ghost) return fadeTab(node, move.ghost, options);
  const header = screen.components.find(({ c }) => c === "Header");
  const shared =
    !fade && move.shared ? flyShared(node, screen.id, header?.id, move.shared, shift, options) : [];
  const flight = node.animate(
    [
      { opacity: shared.length ? 0.85 : 0.2, transform: fade ? "none" : `translateX(${shift}px)` },
      { opacity: 1, transform: "none" },
    ],
    options,
  );
  if (!fade)
    void flight.finished.then(
      () => announceMotionSettled(node),
      () => {},
    );
  return () => {
    flight.cancel();
    shared.forEach((animation) => animation.cancel());
  };
}

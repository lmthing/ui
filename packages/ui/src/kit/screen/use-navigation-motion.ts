import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { isWeb, type TamaguiElement } from "tamagui";
import {
  durations,
  motion,
  motionEase,
  motionProfiles,
  type ScreenLike,
  type ThemeMotion,
} from "../../catalog";
import { captureShared, flyShared } from "./shared-elements";
import { captureTab, fadeTab } from "./tab-ghost";
import type { NativeTabShot } from "./NativeTabGhost";
import { animateNumber } from "../motion";
import { announceMotionSettled } from "../part";
import {
  captureTransition,
  hasTransition,
  takeTransition,
  type NavigationIntent as Intent,
  type ScreenTransition,
  type ScreenTransitionRequest,
} from "./screen-navigation";
type Pose = { x: number; opacity: number };
type NativeFlight = { pose: Pose; ghost?: NativeTabShot };
type Return = { from: string; address: string; scrollTop: number };

function matches(move: Intent | undefined, screen: string): move is Intent {
  return Boolean(
    move &&
    move.from !== screen &&
    (move.goto === screen || move.goto === "back") &&
    Date.now() < move.expires,
  );
}

function captureIntent(
  screen: ScreenLike,
  node: HTMLElement | null,
  target: Pick<Intent, "goto" | "address" | "agent" | "scrollTop"> & { kind?: Intent["kind"] },
  reduced: boolean,
  canAnimate: boolean,
  captureNative: () => NativeTabShot,
): Intent {
  const { address, goto } = target;
  const source = screen.components.find(({ id }) => id === address.split("/")[1]);
  const kind = target.kind ?? (goto === "back" ? "back" : source?.c === "TabBar" ? "tab" : "push");
  const tab = kind === "tab" && (target.kind !== undefined || goto !== screen.id) && canAnimate && !reduced;
  return {
    ...target,
    from: screen.id,
    kind,
    reduced,
    expires: Date.now() + durations.slow * 2,
    shared: kind === "push" && !reduced ? captureShared(node, address) : undefined,
    ghost: tab ? captureTab(node) : undefined,
    ...(!isWeb && tab ? { nativeGhost: captureNative() } : {}),
  };
}

/** The link tells us why the host changed screens; stage jumps and unrelated updates don't fly. */
export function useNavigationMotion(
  screen: ScreenLike,
  {
    mode,
    reduced,
    agent,
    scrollTop,
    captureNative,
    transition,
  }: {
    mode: ThemeMotion;
    reduced: boolean;
    agent: boolean;
    scrollTop(): number;
    captureNative(): NativeTabShot;
    transition: ScreenTransition | undefined;
  },
) {
  const ref = useRef<TamaguiElement>(null);
  const previous = useRef(screen.id);
  const intent = useRef<Intent | undefined>(undefined);
  const arrivedByAgent = useRef<string | undefined>(undefined);
  const origins = useRef(new Map<string, Return>());
  const returned = useRef<Return | undefined>(undefined);
  const [native, setNative] = useState<NativeFlight | undefined>(undefined);
  const makeIntent = useCaptureIntent(screen, ref, { reduced, agent, scrollTop, captureNative });
  const pending = intent.current;
  const navigating = matches(pending, screen.id);
  const cut = navigating && pending.agent;
  const back = navigating && pending.kind === "back" ? origins.current.get(pending.from) : undefined;
  const returnTo =
    back?.from === screen.id ? back : previous.current === screen.id ? returned.current : undefined;
  useLayoutEffect(() => {
    if (transition && hasTransition(transition, screen.id)) {
      previous.current = screen.id;
      intent.current = undefined;
      arrivedByAgent.current = undefined;
      returned.current = undefined;
      origins.current.clear();
      return nextPaint(() => {
        const scripted = takeTransition(transition, screen.id);
        if (scripted && !agent && !scripted.agent)
          return playNavigation(ref.current, screen, scripted, mode, reduced, setNative);
      });
    }
    if (previous.current === screen.id) return;
    previous.current = screen.id;
    const move = intent.current;
    intent.current = undefined;
    arrivedByAgent.current = cut ? screen.id : undefined;
    returned.current = returnTo;
    if (matches(move, screen.id)) {
      if (move.kind === "push") {
        const { from, address, scrollTop } = move;
        origins.current.set(screen.id, { from, address, scrollTop });
      }
      if (move.kind === "back") origins.current.delete(move.from);
    } else origins.current.clear();
    if (agent || !matches(move, screen.id) || move.agent) {
      if (!isWeb) setNative(undefined);
      return;
    }
    return playNavigation(ref.current, screen, move, mode, reduced, setNative);
  }, [screen.id, mode, reduced, agent, transition]);
  return {
    ref,
    capture: (goto: string, address: string, byAgent: boolean) => {
      intent.current = makeIntent(goto, address, byAgent);
    },
    prepare: ({ to, kind, address = "" }: ScreenTransitionRequest) =>
      captureTransition(makeIntent(to, address, false, kind)),
    pose: agent ? undefined : native?.pose,
    nativeGhost: agent ? undefined : native?.ghost,
    agentArrival: cut || arrivedByAgent.current === screen.id,
    returnTo,
    restoreFocus: Boolean(returnTo && !agent && !cut && !arrivedByAgent.current),
  };
}

function useCaptureIntent(
  screen: ScreenLike,
  ref: { current: TamaguiElement | null },
  {
    reduced,
    agent,
    scrollTop,
    captureNative,
  }: {
    reduced: boolean;
    agent: boolean;
    scrollTop(): number;
    captureNative(): NativeTabShot;
  },
) {
  return useCallback(
    (goto: string, address: string, byAgent: boolean, kind?: Intent["kind"]) => {
      const canAnimate = !agent && !byAgent;
      return captureIntent(
        screen,
        isWeb && canAnimate ? (ref.current as HTMLElement | null) : null,
        { goto, address, scrollTop: scrollTop(), agent: !canAnimate, ...(kind ? { kind } : {}) },
        reduced,
        canAnimate,
        captureNative,
      );
    },
    [screen, ref, reduced, agent, scrollTop, captureNative],
  );
}

function nextPaint(play: () => (() => void) | undefined) {
  // The trial mount in Strict Mode never spends the transition.
  let stop: (() => void) | undefined;
  const frame = requestAnimationFrame(() => {
    stop = play();
  });
  return () => {
    cancelAnimationFrame(frame);
    stop?.();
  };
}

function playNavigation(
  ref: TamaguiElement | null,
  screen: ScreenLike,
  move: Intent,
  mode: ThemeMotion,
  reduced: boolean,
  setNative: (flight: NativeFlight | undefined) => void,
) {
  reduced ||= move.reduced;
  const profile = motionProfiles[mode];
  const fade = reduced || move.kind === "tab";
  const node = ref as HTMLElement | null;
  const sign = isWeb && node && getComputedStyle(node).direction === "rtl" ? -1 : 1;
  const shift = fade ? 0 : sign * profile.push * (move.kind === "back" ? -1 : 1);
  const options = { duration: reduced ? durations.fast : profile.navigation, easing: motionEase };
  if (!isWeb) {
    const { reducedFadeStart } = motion;
    const stop = animateNumber(
      0,
      1,
      (progress) =>
        setNative({
          pose: {
            x: shift * (1 - progress),
            opacity: reducedFadeStart + (1 - reducedFadeStart) * progress,
          },
          ...(!reduced && move.nativeGhost ? { ghost: move.nativeGhost } : {}),
        }),
      { duration: options.duration, done: () => setNative(undefined) },
    );
    return () => {
      stop();
      setNative(undefined);
    };
  }
  if (!node?.animate) return;
  if (move.ghost && !reduced) return fadeTab(node, move.ghost, options);
  const header = screen.components.find(({ c }) => c === "Header");
  const shared =
    !fade && move.shared ? flyShared(node, screen.id, header?.id, move.shared, shift, options) : [];
  const flight = node.animate(
    [
      { opacity: motion.reducedFadeStart, transform: fade ? "none" : `translateX(${shift}px)` },
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

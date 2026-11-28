import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { isWeb, type TamaguiElement } from "tamagui";
import { durations, motionEase, motionProfiles, type ScreenLike, type ThemeMotion } from "../../catalog";
import { captureShared, flyShared } from "./shared-elements";
import { captureTab, fadeTab } from "./tab-ghost";
import type { NativeTabShot } from "./NativeTabGhost";
import { animateNumber } from "../motion";
import { announceMotionSettled } from "../part";
import {
  popReturnPoint,
  rememberRoute,
  restoreWebArrival,
  returnIndex,
  type ReturnPoint,
} from "./return-point";

type Intent = {
  from: string;
  goto: string;
  kind: "push" | "back" | "tab";
  shared: ReturnType<typeof captureShared>;
  ghost: ReturnType<typeof captureTab>;
  nativeGhost?: NativeTabShot;
  agent: boolean;
  expires: number;
  address: string;
  top: number;
};
type Pose = { x: number; opacity: number };
type NativeFlight = { pose: Pose; ghost?: NativeTabShot };

function matches(move: Intent | undefined, screen: string): move is Intent {
  return Boolean(
    move &&
    move.from !== screen &&
    (move.goto === screen || move.goto === "back") &&
    Date.now() < move.expires,
  );
}

function useNavigationIntent(
  screen: ScreenLike,
  ref: RefObject<TamaguiElement | null>,
  reduced: boolean,
  agent: boolean,
  captureNative: () => NativeTabShot,
  getScroll: () => number,
) {
  const intent = useRef<Intent | undefined>(undefined);
  const capture = useCallback(
    (goto: string, address: string, byAgent: boolean) => {
      const source = screen.components.find(({ id }) => id === address.split("/")[1]);
      const kind = goto === "back" ? "back" : source?.c === "TabBar" ? "tab" : "push";
      const tab = kind === "tab" && goto !== screen.id && !agent && !byAgent && !reduced;
      const node = isWeb && !agent && !byAgent ? (ref.current as HTMLElement | null) : null;
      intent.current = {
        from: screen.id,
        goto,
        kind,
        address,
        top: node?.querySelector<HTMLElement>("[data-kit-screen-body]")?.scrollTop ?? getScroll(),
        agent: byAgent,
        expires: Date.now() + durations.slow * 2,
        shared: kind === "push" && !reduced ? captureShared(node, address) : undefined,
        ghost: tab ? captureTab(node) : undefined,
        ...(!isWeb && tab ? { nativeGhost: captureNative() } : {}),
      };
    },
    [ref, screen, reduced, agent, captureNative, getScroll],
  );
  return { intent, capture };
}

function focusArrival(
  node: TamaguiElement | null,
  screen: ScreenLike,
  move: Intent,
  returnPoint: ReturnPoint | undefined,
  restoreNative: (point: ReturnPoint | undefined) => void,
) {
  if (isWeb && node) {
    if (move.kind === "tab")
      (node as HTMLElement)
        .querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
        ?.focus({ preventScroll: true });
    else restoreWebArrival(node as HTMLElement, screen, returnPoint);
  } else if (move.kind !== "tab") restoreNative(returnPoint);
}

function trackArrival(
  history: ReturnPoint[],
  { kind, from, address, top }: Intent,
  to: string,
  replacesRoute: ((from: string, to: string) => boolean) | undefined,
) {
  if (kind === "back") return popReturnPoint(history, from, to);
  if (kind === "tab") history.length = 0;
  else rememberRoute(history, { from, to, address, top }, replacesRoute?.(from, to) ?? false);
}

/** The link tells us why the host changed screens; stage jumps and unrelated updates don't fly. */
export function useNavigationMotion(
  screen: ScreenLike,
  mode: ThemeMotion,
  reduced: boolean,
  agent: boolean,
  captureNative: () => NativeTabShot,
  getScroll: () => number,
  restoreNative: (point: ReturnPoint | undefined) => void,
  replacesRoute?: (from: string, to: string) => boolean,
) {
  const ref = useRef<TamaguiElement>(null);
  const previous = useRef(screen.id);
  const { intent, capture } = useNavigationIntent(screen, ref, reduced, agent, captureNative, getScroll);
  const arrivedByAgent = useRef<string | undefined>(undefined);
  const history = useRef<ReturnPoint[]>([]);
  const returnTop = useRef<{ id: string; top: number } | undefined>(undefined);
  const [native, setNative] = useState<NativeFlight | undefined>(undefined);
  const pending = intent.current;
  const navigating = matches(pending, screen.id);
  const cut = navigating && pending.agent;
  const returnPoint =
    navigating && pending.kind === "back"
      ? history.current[returnIndex(history.current, pending.from, screen.id)]
      : undefined;
  useLayoutEffect(() => {
    if (previous.current === screen.id) return;
    previous.current = screen.id;
    const move = intent.current;
    intent.current = undefined;
    arrivedByAgent.current = cut ? screen.id : undefined;
    returnTop.current = undefined;
    if (!matches(move, screen.id)) {
      history.current.length = 0;
      if (!isWeb) setNative(undefined);
      return;
    }
    const point = trackArrival(history.current, move, screen.id, replacesRoute);
    if (point) returnTop.current = { id: screen.id, top: point.top };
    if (agent || move.agent) return;
    focusArrival(ref.current, screen, move, returnPoint, restoreNative);
    return playNavigation(ref.current, screen, move, mode, reduced, setNative);
  }, [screen.id, mode, reduced, agent]);
  return {
    ref,
    capture,
    pose: agent ? undefined : native?.pose,
    nativeGhost: agent ? undefined : native?.ghost,
    agentArrival: cut || arrivedByAgent.current === screen.id,
    initialBodyScroll: returnPoint?.top ?? (returnTop.current?.id === screen.id ? returnTop.current.top : 0),
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
  if (reduced) return;
  const profile = motionProfiles[mode];
  const fade = move.kind === "tab";
  const node = ref as HTMLElement | null;
  const sign = isWeb && node && getComputedStyle(node).direction === "rtl" ? -1 : 1;
  const shift = fade ? 0 : sign * profile.push * (move.kind === "back" ? -1 : 1);
  const options = { duration: profile.navigation, easing: motionEase };
  if (!isWeb) {
    const stop = animateNumber(
      0,
      1,
      (opacity) =>
        setNative({
          pose: { x: shift * (1 - opacity), opacity: fade ? opacity : 1 },
          ...(move.nativeGhost ? { ghost: move.nativeGhost } : {}),
        }),
      { duration: options.duration, done: () => setNative(undefined) },
    );
    return () => {
      stop();
      setNative(undefined);
    };
  }
  if (!node?.animate) return;
  if (move.ghost) return fadeTab(node, move.ghost, options);
  const header = screen.components.find(({ c }) => c === "Header");
  const shared =
    !fade && move.shared ? flyShared(node, screen.id, header?.id, move.shared, shift, options) : [];
  const flight = node.animate(
    [
      { opacity: 1, transform: fade ? "none" : `translateX(${shift}px)` },
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

import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { isWeb, type TamaguiElement } from "tamagui";
import { durations, motionEase, motionProfiles, type ScreenLike, type ThemeMotion } from "../../catalog";
import { captureShared, flyShared } from "./shared-elements";
import { captureTab, fadeTab } from "./tab-ghost";
import type { NativeTabShot } from "./NativeTabGhost";
import { animateNumber, expireRecordArrival } from "../motion";
import { announceMotionSettled } from "../part";
import {
  captureTransition,
  matchesNavigation as matches,
  readTransition,
  takeTransition,
  type NavigationIntent as Intent,
  type ScreenTransition,
  type ScreenTransitionRequest,
} from "./screen-navigation";
import { useNavigationHistory } from "./use-navigation-history";
import { arrivalAddress } from "./return-point";
import type { NavigationFocus } from "./use-return-focus";
type Pose = { x: number; opacity: number };
type NativeFlight = { pose: Pose; ghost?: NativeTabShot };
type CaptureOptions = {
  reduced: boolean;
  agent: boolean;
  cut: boolean;
  scrollTop(): number;
  captureNative(): NativeTabShot;
};
type NavigationOptions = CaptureOptions & {
  mode: ThemeMotion;
  transition: ScreenTransition | undefined;
  replacesRoute?: ((from: string, to: string) => boolean) | undefined;
};

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
  { mode, reduced, agent, cut, scrollTop, captureNative, transition, replacesRoute }: NavigationOptions,
) {
  const ref = useRef<TamaguiElement>(null);
  const intent = useRef<Intent | undefined>(undefined);
  const [native, setNative] = useState<NativeFlight | undefined>(undefined);
  const makeIntent = useCaptureIntent(screen, ref, { reduced, agent, cut, scrollTop, captureNative });
  const skipMotion = agent || cut;
  const play = (move: Intent) => playNavigation(ref.current, screen, move, mode, reduced, setNative);
  const scripted = readTransition(transition, screen.id);
  const startScripted = useScriptedFlight(
    transition,
    screen.id,
    `${mode}:${reduced}:${skipMotion}`,
    skipMotion,
    play,
  );
  const history = useNavigationHistory(screen.id, scripted ?? intent.current, replacesRoute);
  const returnTo = scripted?.restore ?? history.returnTo;
  useLayoutEffect(() => {
    if (scripted) {
      intent.current = undefined;
      history.commit(scripted, agent || scripted.agent, true);
      const cue = scripted.record;
      // Exactly one commit can use this cue, even if no matching receipt was mounted.
      if (cue) expireRecordArrival(cue);
      return startScripted();
    }
    if (!history.changed()) return;
    const move = intent.current;
    intent.current = undefined;
    history.commit(move);
    if (skipMotion || !matches(move, screen.id) || move.agent) {
      if (!isWeb) setNative(undefined);
      return;
    }
    return play(move);
  }, [screen.id, mode, reduced, agent, cut, transition]);
  return {
    ref,
    capture: (goto: string, address: string, byAgent: boolean) => {
      intent.current = makeIntent(goto, address, byAgent);
    },
    prepare: (request: ScreenTransitionRequest) => captureTransition(moveFor(request, makeIntent)),
    record: scripted ? (scripted.agent ? undefined : scripted.record) : history.record,
    pose: skipMotion ? undefined : native?.pose,
    nativeGhost: skipMotion ? undefined : native?.ghost,
    agentArrival: history.agentArrival,
    returnTo,
    focus: focusOf(screen, agent, scripted, intent.current, returnTo, history.scriptedFocus),
  };
}

function moveFor(request: ScreenTransitionRequest, make: ReturnType<typeof useCaptureIntent>): Intent {
  const { to, kind, address = "", restore } = request;
  const motion = kind === "pop" ? "back" : kind;
  return {
    ...make(to, address, false, motion),
    ...(motion === "back" && restore ? { restore: { ...restore } } : {}),
    ...(kind === "record" ? { record: { ...request.record } } : {}),
  };
}

function focusOf(
  screen: ScreenLike,
  agent: boolean,
  scripted: Intent | undefined,
  pending: Intent | undefined,
  returnTo: ReturnType<typeof useNavigationHistory>["returnTo"],
  settledScripted: boolean,
): NavigationFocus | undefined {
  if (agent || scripted?.agent) return;
  if (scripted && scripted.kind !== "back") return;
  if (scripted || (settledScripted && !pending))
    return returnTo?.address ? { address: returnTo.address, defer: true, point: returnTo } : undefined;
  if (!matches(pending, screen.id) || pending.agent) return;
  return {
    address: pending.kind === "back" ? returnTo?.address : undefined,
    fallback: arrivalAddress(screen),
    tab: pending.kind === "tab",
    point: returnTo,
  };
}

function useCaptureIntent(
  screen: ScreenLike,
  ref: { current: TamaguiElement | null },
  { reduced, agent, cut, scrollTop, captureNative }: CaptureOptions,
) {
  return useCallback(
    (goto: string, address: string, byAgent: boolean, kind?: Intent["kind"]) => {
      const agentAction = agent || byAgent;
      const canAnimate = !agentAction && !cut;
      return captureIntent(
        screen,
        isWeb && canAnimate ? (ref.current as HTMLElement | null) : null,
        { goto, address, scrollTop: scrollTop(), agent: agentAction, ...(kind ? { kind } : {}) },
        reduced,
        canAnimate,
        captureNative,
      );
    },
    [screen, ref, reduced, agent, cut, scrollTop, captureNative],
  );
}

type Flight = { token: ScreenTransition; key: string; kept: boolean; stop: (() => void) | undefined };

function useScriptedFlight(
  token: ScreenTransition | undefined,
  screen: string,
  preferences: string,
  skipMotion: boolean,
  play: (move: Intent) => (() => void) | undefined,
) {
  const active = useRef<Flight | undefined>(undefined);
  const key = `${screen}:${preferences}`;
  return () => {
    if (!token) return;
    let flight = active.current;
    if (!flight || flight.token !== token || flight.key !== key) {
      active.current = undefined;
      flight?.stop?.();
      const move = takeTransition(token, screen);
      if (!move) return;
      flight = { token, key, kept: true, stop: !skipMotion && !move.agent ? play(move) : undefined };
      active.current = flight;
    }
    const retained = flight;
    retained.kept = true;
    return () => {
      retained.kept = false;
      // Adopt the existing flight during Strict Mode's synchronous effect replay.
      queueMicrotask(() => {
        if (active.current === retained && !retained.kept) {
          retained.stop?.();
          active.current = undefined;
        }
      });
    };
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
  if (move.kind === "record" || reduced || move.reduced) return;
  const profile = motionProfiles[mode];
  const fade = move.kind === "tab";
  const node = ref as HTMLElement | null;
  const sign = isWeb && node && getComputedStyle(node).direction === "rtl" ? -1 : 1;
  const shift = fade ? 0 : sign * profile.push * (move.kind === "back" ? -1 : 1);
  const options = {
    duration: profile.navigation,
    easing: motionEase,
    fill: "backwards" as const,
  };
  if (!isWeb) {
    const stop = animateNumber(
      0,
      1,
      (progress) =>
        setNative({
          pose: {
            x: shift * (1 - progress),
            opacity: fade ? progress : 1,
          },
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
  const shared = fade ? [] : matchingFlight(node, screen, move, shift, options);
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

function matchingFlight(
  node: HTMLElement,
  screen: ScreenLike,
  move: Intent,
  shift: number,
  options: KeyframeAnimationOptions,
) {
  if (!move.shared) return [];
  const header = screen.components.find(({ c }) => c === "Header");
  return flyShared(node, screen.id, header?.id, move.shared, shift, options);
}

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
import { animateNumber, expireRecordArrival } from "../motion";
import { announceMotionSettled } from "../part";
import {
  captureTransition,
  readTransition,
  takeTransition,
  type NavigationIntent as Intent,
  type ReceivingRecord,
  type ScreenReturnPoint,
  type ScreenTransition,
  type ScreenTransitionRequest,
} from "./screen-navigation";
type Pose = { x: number; opacity: number };
type NativeFlight = { pose: Pose; ghost?: NativeTabShot };
type Return = ScreenReturnPoint & { from: string };
type CaptureOptions = {
  reduced: boolean;
  agent: boolean;
  scrollTop(): number;
  captureNative(): NativeTabShot;
};
type NavigationOptions = CaptureOptions & { mode: ThemeMotion; transition: ScreenTransition | undefined };

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
  { mode, reduced, agent, scrollTop, captureNative, transition }: NavigationOptions,
) {
  const ref = useRef<TamaguiElement>(null);
  const intent = useRef<Intent | undefined>(undefined);
  const [native, setNative] = useState<NativeFlight | undefined>(undefined);
  const makeIntent = useCaptureIntent(screen, ref, { reduced, agent, scrollTop, captureNative });
  const play = (move: Intent) => playNavigation(ref.current, screen, move, mode, reduced, setNative);
  const scripted = readTransition(transition, screen.id);
  const startScripted = useScriptedFlight(transition, screen.id, `${mode}:${reduced}:${agent}`, agent, play);
  const history = useNavigationHistory(screen.id, scripted ?? intent.current);
  const returnTo = scripted?.restore ?? history.returnTo;
  useLayoutEffect(() => {
    if (scripted) {
      intent.current = undefined;
      history.commit(scripted, agent || scripted.agent);
      const cue = scripted.record;
      // Exactly one commit can use this cue, even if no matching receipt was mounted.
      if (cue) queueMicrotask(() => expireRecordArrival(cue));
      return startScripted();
    }
    if (!history.changed()) return;
    const move = intent.current;
    intent.current = undefined;
    history.commit(move);
    if (agent || !matches(move, screen.id) || move.agent) {
      if (!isWeb) setNative(undefined);
      return;
    }
    return play(move);
  }, [screen.id, mode, reduced, agent, transition]);
  return {
    ref,
    capture: (goto: string, address: string, byAgent: boolean) => {
      intent.current = makeIntent(goto, address, byAgent);
    },
    prepare: (request: ScreenTransitionRequest) => captureTransition(moveFor(request, makeIntent)),
    record: scripted ? (scripted.agent ? undefined : scripted.record) : history.record,
    pose: agent ? undefined : native?.pose,
    nativeGhost: agent ? undefined : native?.ghost,
    agentArrival: history.agentArrival,
    returnTo,
    restoreFocus: Boolean(returnTo && !agent && !(scripted?.agent ?? history.skipFocus)),
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

function useNavigationHistory(id: string, pending: Intent | undefined) {
  const previous = useRef(id);
  const arrivedByAgent = useRef<string | undefined>(undefined);
  const origins = useRef(new Map<string, Return>());
  const returned = useRef<ScreenReturnPoint | undefined>(undefined);
  const skipFocus = useRef(false);
  const record = useRef<ReceivingRecord | undefined>(undefined);
  const navigating = matches(pending, id);
  const back = navigating && pending.kind === "back" ? origins.current.get(pending.from) : undefined;
  const returnTo = back?.from === id ? back : previous.current === id ? returned.current : undefined;
  return {
    changed: () => previous.current !== id,
    agentArrival: (navigating && pending.agent) || arrivedByAgent.current === id,
    skipFocus: navigating ? pending.agent : skipFocus.current,
    returnTo,
    record: previous.current === id ? record.current : undefined,
    commit(move: Intent | undefined, skip = move?.agent ?? false) {
      const requestedRestore = move?.restore;
      previous.current = id;
      skipFocus.current = skip;
      record.current = skip ? undefined : move?.record;
      if (!matches(move, id)) {
        arrivedByAgent.current = undefined;
        returned.current = requestedRestore;
        origins.current.clear();
        return;
      }
      arrivedByAgent.current = move.agent ? id : undefined;
      returned.current = requestedRestore ?? returnTo;
      if (move.kind === "push") {
        const { from, address, scrollTop } = move;
        origins.current.set(id, { from, address, scrollTop });
      } else if (move.kind === "back") origins.current.delete(move.from);
      else origins.current.clear();
    },
  };
}

function useCaptureIntent(
  screen: ScreenLike,
  ref: { current: TamaguiElement | null },
  { reduced, agent, scrollTop, captureNative }: CaptureOptions,
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

type Flight = { token: ScreenTransition; key: string; kept: boolean; stop: (() => void) | undefined };

function useScriptedFlight(
  token: ScreenTransition | undefined,
  screen: string,
  preferences: string,
  agent: boolean,
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
      flight = { token, key, kept: true, stop: !agent && !move.agent ? play(move) : undefined };
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
  if (move.kind === "record") return;
  reduced ||= move.reduced;
  const profile = motionProfiles[mode];
  const fade = reduced || move.kind === "tab";
  const node = ref as HTMLElement | null;
  const sign = isWeb && node && getComputedStyle(node).direction === "rtl" ? -1 : 1;
  const shift = fade ? 0 : sign * profile.push * (move.kind === "back" ? -1 : 1);
  const options = {
    duration: reduced ? durations.fast : profile.navigation,
    easing: motionEase,
    fill: "backwards" as const,
  };
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
  const shared = fade ? [] : matchingFlight(node, screen, move, shift, options);
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

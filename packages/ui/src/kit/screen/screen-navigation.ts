import type { NativeTabShot } from "./NativeTabGhost";
import type { captureShared } from "./shared-elements";
import type { captureTab } from "./tab-ghost";

export type ScreenReturnPoint = { address?: string; scrollTop: number };

export type ScreenTransitionRequest = {
  /** The actual destination screen id, even for Back. Tree identity is owned by the host. */
  to: string;
  kind: "push" | "back" | "tab";
  /** Optional full source part address, for matched title/photo motion when both are mounted. */
  address?: string;
  /** For scripted Back, use the point saved by the host before it left this destination. */
  restore?: ScreenReturnPoint;
};

declare const screenTransition: unique symbol;
/** A short-lived, single-use capture. Pass it only to the intended destination PhoneScreen. */
export type ScreenTransition = { readonly [screenTransition]: true };

export type ScreenNavigation = {
  /** Capture before switching trees. This never dispatches an action or changes screens. */
  prepare(request: ScreenTransitionRequest): ScreenTransition;
  /** Save the current viewport and, optionally, the exact control to refocus on Back. */
  getReturnPoint(address?: string): ScreenReturnPoint;
};

export type NavigationIntent = {
  from: string;
  goto: string;
  kind: ScreenTransitionRequest["kind"];
  shared: ReturnType<typeof captureShared>;
  ghost: ReturnType<typeof captureTab>;
  nativeGhost?: NativeTabShot;
  agent: boolean;
  reduced: boolean;
  address: string;
  scrollTop: number;
  restore?: ScreenReturnPoint;
  expires: number;
};

const captures = new WeakMap<ScreenTransition, NavigationIntent>();

export function captureTransition(intent: NavigationIntent) {
  const transition = Object.freeze({}) as ScreenTransition;
  captures.set(transition, intent);
  return transition;
}

export function readTransition(transition: ScreenTransition | undefined, screen: string) {
  const capture = transition && captures.get(transition);
  return capture?.goto === screen && Date.now() < capture.expires ? capture : undefined;
}

export function takeTransition(transition: ScreenTransition, screen: string) {
  const capture = captures.get(transition);
  if (capture?.goto !== screen) return;
  captures.delete(transition);
  if (Date.now() < capture.expires) return capture;
}
